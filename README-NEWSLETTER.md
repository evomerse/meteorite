# 📧 Fonctionnalité Bulletins Météo Hebdomadaires

Ce document explique comment configurer et utiliser la nouvelle fonctionnalité de bulletins météo hebdomadaires.

## 📋 Configuration Requise

### 1. Créer la table dans Supabase

Exécutez le fichier SQL `supabase-schema.sql` dans votre base de données Supabase :

1. Allez dans votre projet Supabase → SQL Editor
2. Copiez-collez le contenu de `supabase-schema.sql`
3. Exécutez la requête

Cela créera :
- La table `newsletter_subscriptions` pour stocker les abonnements
- Les index pour améliorer les performances
- Les politiques RLS (Row Level Security) pour la sécurité
- Un trigger pour mettre à jour automatiquement `updated_at`

### 2. Déployer les Edge Functions Supabase

#### A. Fonction `send-newsletter`

Cette fonction envoie un bulletin individuel à un utilisateur.

```bash
# Depuis le dossier supabase-functions/send-newsletter
supabase functions deploy send-newsletter
```

#### B. Fonction `send-weekly-newsletters`

Cette fonction envoie tous les bulletins hebdomadaires planifiés.

```bash
# Depuis le dossier supabase-functions/send-weekly-newsletters
supabase functions deploy send-weekly-newsletters
```

### 3. Configurer les Variables d'Environnement

Dans votre projet Supabase, allez dans Settings → Edge Functions → Secrets et ajoutez :

- `SUPABASE_URL` : Votre URL Supabase (déjà disponible par défaut)
- `SUPABASE_SERVICE_ROLE_KEY` : Votre clé service_role (déjà disponible par défaut)
- `CRON_SECRET` : Un secret pour sécuriser l'endpoint du cron (générez un string aléatoire)
- `RESEND_API_KEY` : (Optionnel) Clé API si vous utilisez Resend pour l'envoi d'emails

### 4. Configurer l'Envoi d'Emails

**Option A : Utiliser Resend (Recommandé)**

1. Créez un compte sur [resend.com](https://resend.com)
2. Obtenez votre clé API
3. Configurez un domaine (ou utilisez le domaine de test)
4. Décommentez et configurez le code Resend dans `supabase-functions/send-newsletter/index.ts`

**Option B : Utiliser SendGrid**

1. Créez un compte sur [sendgrid.com](https://sendgrid.com)
2. Obtenez votre clé API
3. Remplacez le code d'envoi dans la fonction par l'API SendGrid

**Option C : Utiliser votre propre SMTP**

Configurez l'envoi via SMTP directement dans la fonction.

### 5. Configurer le Cron Job pour l'Envoi Hebdomadaire

#### Option A : Utiliser pg_cron (dans Supabase)

Exécutez cette requête SQL dans Supabase :

```sql
-- Installer l'extension pg_cron si ce n'est pas déjà fait
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Planifier l'envoi tous les dimanches à 15h (heure UTC, ajustez selon votre fuseau)
SELECT cron.schedule(
  'send-weekly-newsletters',
  '0 15 * * 0', -- Dimanche à 15h UTC
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_URL.supabase.co/functions/v1/send-weekly-newsletters',
      headers := '{"Authorization": "Bearer YOUR_CRON_SECRET", "Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
```

⚠️ Remplacez :
- `YOUR_PROJECT_URL` par votre URL Supabase
- `YOUR_CRON_SECRET` par le secret que vous avez défini dans les variables d'environnement

#### Option B : Utiliser GitHub Actions (Gratuit)

Créez `.github/workflows/weekly-newsletter.yml` :

```yaml
name: Send Weekly Newsletters

on:
  schedule:
    # Tous les dimanches à 15h UTC (ajustez la cron expression selon vos besoins)
    - cron: '0 15 * * 0'
  workflow_dispatch: # Permet de déclencher manuellement

jobs:
  send:
    runs-on: ubuntu-latest
    steps:
      - name: Call Supabase Function
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json" \
            https://YOUR_PROJECT_URL.supabase.co/functions/v1/send-weekly-newsletters
```

Ajoutez `CRON_SECRET` dans les Secrets de votre repository GitHub.

#### Option C : Utiliser Vercel Cron (si vous hébergez sur Vercel)

Ajoutez dans `vercel.json` :

```json
{
  "crons": [
    {
      "path": "/api/cron/weekly-newsletter",
      "schedule": "0 15 * * 0"
    }
  ]
}
```

## 🎯 Utilisation

### Pour les Utilisateurs

1. Connectez-vous à votre compte
2. Allez sur le dashboard
3. Sélectionnez ou recherchez une ville
4. Cliquez sur le bouton **"📧 Recevoir les bulletins météo hebdomadaires"**
5. Le premier bulletin est envoyé immédiatement
6. Les bulletins suivants seront envoyés automatiquement tous les dimanches à 15h

### Fonctionnalités

- ✅ Abonnement par ville
- ✅ Envoi immédiat du premier bulletin après activation
- ✅ Envoi automatique hebdomadaire (dimanche 15h)
- ✅ Possibilité de se désabonner
- ✅ Bulletins personnalisés avec prévisions sur 7 jours
- ✅ Design email responsive et moderne

## 🔧 Maintenance

### Vérifier les Abonnements Actifs

```sql
SELECT COUNT(*) FROM newsletter_subscriptions WHERE active = true;
```

### Voir les Abonnements d'un Utilisateur

```sql
SELECT * FROM newsletter_subscriptions WHERE user_id = 'USER_ID_HERE';
```

### Désactiver un Abonnement

```sql
UPDATE newsletter_subscriptions 
SET active = false 
WHERE id = 'SUBSCRIPTION_ID_HERE';
```

## 🐛 Dépannage

### Les emails ne partent pas

1. Vérifiez que votre service email (Resend, SendGrid, etc.) est correctement configuré
2. Vérifiez les logs des Edge Functions dans Supabase
3. Testez manuellement la fonction `send-newsletter` depuis le dashboard Supabase

### Le cron ne fonctionne pas

1. Vérifiez que `pg_cron` est installé et activé
2. Vérifiez le secret `CRON_SECRET` correspond
3. Testez manuellement en appelant l'URL de la fonction avec le bon header

### Les utilisateurs ne voient pas le bouton

1. Vérifiez qu'ils sont bien connectés
2. Vérifiez que la ville est bien sélectionnée
3. Vérifiez la console du navigateur pour d'éventuelles erreurs

## 📝 Notes Importantes

- **Limites d'emails** : Assurez-vous de respecter les limites de votre service d'email
- **Coûts** : Certains services d'email peuvent avoir des limites gratuites
- **Spam** : Assurez-vous de respecter les lois anti-spam (RGPD, CAN-SPAM, etc.)
- **Prévisualisation** : Le design HTML peut varier selon le client email utilisé

## 🔐 Sécurité

- Les abonnements sont protégés par RLS (Row Level Security)
- Les utilisateurs ne peuvent voir/modifier que leurs propres abonnements
- Le cron endpoint est protégé par un secret
- Les emails contiennent un lien de désabonnement

## 🚀 Améliorations Futures Possibles

- [ ] Choix du jour et de l'heure pour l'envoi hebdomadaire
- [ ] Préférences de format (HTML/texte)
- [ ] Notifications push en plus des emails
- [ ] Statistiques d'ouverture des emails
- [ ] Prévisions personnalisées selon les activités

