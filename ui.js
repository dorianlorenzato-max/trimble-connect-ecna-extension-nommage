/**
 * Module pour la manipulation du DOM et la mise à jour de l'interface utilisateur.
 */

// Affiche l'état de chargement
function renderLoading(container) {
  container.innerHTML = `
        <h1>Chargement...</h1>
        <div style="text-align:center; padding: 20px;">
            <img src="https://dorianlorenzato-max.github.io/trimble-connect-ecna-extension/Loading_icon.gif" alt="Chargement..." style="width: 50px;">
        </div>
    `;
}

// Affiche un message d'erreur
function renderError(container, error) {
  container.innerHTML = `
        <h1>Erreur !</h1>
        <p>Une erreur est survenue. Veuillez vérifier la console pour les détails.</p>
        <p><b>Détail :</b> ${error.message || error}</p>
    `;
}

// Affiche un message de bienvenue générique
function renderWelcome(container) {
  container.innerHTML = `<p>Bienvenue sur l'extension ECNA Nommage Docs ! Veuillez utiliser les boutons ci-dessus.</p>`;
}

// Pour afficher le chargement de sauvegarde
function renderSaving(container) {
  container.innerHTML = `
        <div class="message-container">
            <h2>Sauvegarde en cours...</h2>
            <p>Veuillez patienter pendant que les modifications sont enregistrées.</p>
            <img src="https://dorianlorenzato-max.github.io/trimble-connect-ecna-extension/Loading_icon.gif" alt="Sauvegarde..." style="width: 50px; margin-top: 15px;">
        </div>
    `;
}

// Pour afficher les messages de succès
function renderSuccess(container, message) {
  container.innerHTML = `
        <div class="message-container success">
            <h2>Succès !</h2>
            <p>${message}</p>
        </div>
    `;
}

// Nouvelle fonction pour la page d'accueil avec les 3 boutons principaux
function renderHomePageWithButtons(container, isAdmin) {
  const adminAccessMessage = isAdmin
    ? ""
    : '<p style="color: grey; font-style: italic;">(Accès administrateur requis pour la configuration)</p>';

  container.innerHTML = `
    <div style="text-align: center; padding: 20px;">
        <h1>Extension ECNA Nommage Docs</h1>
        <p>Sélectionnez une option ci-dessous pour commencer :</p>
        <div style="display: flex; flex-direction: column; gap: 15px; max-width: 400px; margin: 30px auto;">
            <button id="homeHelpNamingBtn" class="button-primary">Aide à la Codification</button>
            <button id="homeControlNamingBtn" class="button-primary">Contrôle des Nommages</button>
            <button id="homeConfigNamingBtn" class="button-primary" ${isAdmin ? "" : "disabled"} title="${isAdmin ? "" : "Réservé aux administrateurs"}">Configuration du Nommage ${adminAccessMessage}</button>
        </div>
        ${adminAccessMessage}
    </div>
  `;
}

// Exporter toutes les fonctions désormais
export {
  renderLoading,
  renderError,
  renderWelcome, // Gardée pour une utilisation générique
  renderSaving,
  renderSuccess,
  renderHomePageWithButtons, // Nouvelle fonction d'accueil
};
