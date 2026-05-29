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

// Affiche la page principale de configuration des nommages
function renderConfigPage(container, isAdmin) {
  const adminButtonsHtml = isAdmin
    ? `
    <button id="create-naming-btn" class="config-button">Créer une codification</button>
    <button id="manage-naming-btn" class="config-button">Gérer les codifications</button>
    <button id="assign-naming-btn" class="config-button">Affectation des codifications</button>
  `
    : "";

  container.innerHTML = `
        <div class="config-page-container">
            <h1>Configuration des Codifications de Nommage</h1>
            <div class="config-actions">
                ${adminButtonsHtml}
            </div>
            <div id="naming-config-summary-container">
                {/* Le tableau sera injecté ici plus tard */}
            </div>
        </div>
    `;
}

// Fonction pour rendre le tableau récapitulatif des codifications
function renderNamingConfigSummaryTable(container, summaryData) {
  if (!summaryData || summaryData.length === 0) {
    container.innerHTML =
      '<p style="text-align:center; margin-top:20px;">Aucune codification de nommage n\'est actuellement configurée ou affectée.</p>';
    return;
  }

  const tableRows = summaryData
    .map(
      (item) => `
    <tr>
      <td>${item.ruleName}</td>
      <td>${item.affectedFolders.length > 0 ? item.affectedFolders.join(", ") : "Aucun"}</td>
      <td>${item.date === "N/A" ? "N/A" : new Date(item.date).toLocaleDateString()}</td>
      <td>${item.creator}</td>
    </tr>
  `,
    )
    .join("");

  container.innerHTML = `
    <div class="summary-table-wrapper">
        <table class="summary-table">
            <thead>
                <tr>
                    <th>Nom de la codification en place</th>
                    <th>Dossiers affectés</th>
                    <th>Date de mise en place</th>
                    <th>Nom du créateur</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
    </div>
  `;
}

// interface de création de convention de nommage
function renderCreateNamingRulePage(container, ruleData) {
  const pageTitle = ruleData.name
    ? `Édition de la codification : ${ruleData.name}`
    : "Création d'une nouvelle codification de nommage";

  // Pour l'instant, le tableau est statique. Il sera rendu dynamiquement plus tard.
  const tableHeaders =
    ruleData.columns.length > 0
      ? ruleData.columns.map((col) => `<th>${col.name}</th>`).join("")
      : "<th>(Aucune colonne)</th>";

  const tableValues =
    ruleData.columns.length > 0
      ? ruleData.columns
          .map((col) => `<td>${col.values.join("<br>")}</td>`)
          .join("")
      : "<td></td>";

  container.innerHTML = `
    <div class="naming-rule-creation-container">
        <h1>${pageTitle}</h1>

        <div class="form-section">
            <label for="naming-rule-name">Affecter un nom à la convention de nommage :</label>
            <input type="text" id="naming-rule-name" value="${ruleData.name || ""}" placeholder="Ex: Convention principale">
        </div>

        <div class="naming-rule-actions">
            <button id="add-column-btn" class="button-secondary">Ajouter une colonne</button>
            <button id="reorder-columns-btn" class="button-secondary">Réorganiser colonnes</button>
            <button id="delete-column-mode-btn" class="button-secondary">Supprimer colonne</button>
        </div>

        <div class="naming-rule-preview-container">
            <h3>Aperçu de la codification</h3>
            <div class="naming-rule-preview-table-wrapper">
                <table class="naming-rule-preview-table">
                    <thead>
                        <tr>${tableHeaders}</tr>
                    </thead>
                    <tbody>
                        <tr>${tableValues}</tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div class="form-actions">
            <button id="cancel-naming-rule-btn" class="button-secondary">Annuler</button>
            <button id="save-naming-rule-btn" class="button-primary">Enregistrer</button>
        </div>
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
  renderConfigPage,
  renderNamingConfigSummaryTable,
  renderCreateNamingRulePage,
};
