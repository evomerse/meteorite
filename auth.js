// auth.js - Version stable et non-agressive
import { supabase } from './supabase-client.js';

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const feedback = document.getElementById('feedback');

function showFeedback(message, isError = false) {
    if (feedback) {
        feedback.textContent = message;
        feedback.className = isError ? 'feedback error' : 'feedback success';
        feedback.style.display = 'block';
    }
}


// GESTION DES FORMULAIRES (inchangée)
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { email, password } = Object.fromEntries(new FormData(e.target));
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            showFeedback(error.message, true);
        } else {
            // Utiliser .replace() pour éviter que l'utilisateur puisse revenir en arrière
            window.location.replace('/dashboard.html');
        }
    });
}
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { email, password } = Object.fromEntries(new FormData(e.target));
        if (password.length < 6) {
            showFeedback('Le mot de passe doit faire 6 caractères minimum.', true);
            return;
        }

        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
            showFeedback(error.message, true);
        } else {
            // 💡 Nouveau : créer une ligne profil pour ce compte
            if (data?.user) {
                await supabase.from('profiles').insert({
                    id: data.user.id,
                    email: data.user.email,
                });
            }
            showFeedback('Inscription réussie ! Vérifiez vos emails pour confirmer.', false);
        }
    });
}



const forgotPasswordLink = document.getElementById('forgot-password-link');

if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        if (!email) {
            showFeedback("Veuillez d'abord entrer votre adresse e-mail.", true);
            return;
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin, // URL où l'utilisateur sera redirigé après avoir cliqué sur le lien
        });

        if (error) {
            showFeedback(`Erreur : ${error.message}`, true);
        } else {
            showFeedback("Un e-mail de réinitialisation a été envoyé. Veuillez vérifier votre boîte de réception.", false);
        }
    });
}


// **LA CORRECTION CLÉ**
// On vérifie une seule fois si une session existe déjà au chargement de la page.
(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        // Si l'utilisateur est déjà connecté, on l'envoie au dashboard sans attendre.
        window.location.replace('/dashboard.html');
    }
    // Sinon, on ne fait RIEN. On le laisse sur la page de connexion.
})();