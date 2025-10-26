import { supabase } from './supabase-client.js';

// --- Éléments du DOM ---
const passwordForm = document.getElementById('password-form');
const emailForm = document.getElementById('email-form');
const currentEmailEl = document.getElementById('current-email');
const feedbackEl = document.getElementById('feedback');

let user = null;

// --- Fonctions ---
function showFeedback(message, isError = false) {
    feedbackEl.textContent = message;
    feedbackEl.className = isError ? 'feedback error' : 'feedback success';
    feedbackEl.style.display = 'block';
    // Cache le message après quelques secondes
    setTimeout(() => { feedbackEl.style.display = 'none'; }, 5000);
}

// Met à jour le mot de passe de l'utilisateur
async function updateUserPassword(newPassword) {
    if (newPassword.length < 6) {
        showFeedback("Le mot de passe doit contenir au moins 6 caractères.", true);
        return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
        showFeedback(`Erreur : ${error.message}`, true);
    } else {
        showFeedback("Mot de passe mis à jour avec succès !", false);
        passwordForm.reset();
    }
}

// Met à jour l'email de l'utilisateur
async function updateUserEmail(newEmail) {
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) {
        showFeedback(`Erreur : ${error.message}`, true);
    } else {
        showFeedback("Veuillez vérifier votre nouvelle boîte de réception pour confirmer le changement d'email.", false);
        emailForm.reset();
    }
}


// --- Initialisation de la page ---
async function initializePage() {
    // Vérifie si un utilisateur est connecté
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        // Si personne n'est connecté, on le renvoie à la page de connexion
        window.location.replace('/login.html');
        return;
    }

    user = session.user;
    currentEmailEl.textContent = user.email;

    // Attache les événements aux formulaires
    passwordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newPassword = document.getElementById('new-password').value;
        updateUserPassword(newPassword);
    });

    emailForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newEmail = document.getElementById('new-email').value;
        updateUserEmail(newEmail);
    });
}

// Lance l'initialisation au chargement de la page
initializePage();