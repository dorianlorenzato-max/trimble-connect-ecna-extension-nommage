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

  // Ajoute une classe CSS lorsque le mode réorganisation est actif
  const tableWrapperClass =
    ruleData.editMode === "reorder" ? "reorder-mode" : "";

  const tableHeaders =
    ruleData.columns.length > 0
      ? ruleData.columns
          .map((col, index) => {
            // Affiche l'icône de poubelle si en mode suppression
            const deleteIcon =
              ruleData.editMode === "delete"
                ? `<span class="delete-column-icon" data-column-index="${index}">&#128465;</span>`
                : "";
            // Ajoute une classe pour le glisser-déposer
            const thClass =
              ruleData.editMode === "reorder" ? "draggable-column" : "";

            return `<th class="${thClass}">${deleteIcon}${col.name}</th>`;
          })
          .join("")
      : "<th>(Aucune colonne)</th>";

  const typeDisplayMap = {
    text: "Texte libre",
    list: "Liste",
    number1: "1 chiffre",
    number2: "2 chiffres",
    number3: "3 chiffres",
    trigram: "Trigramme",
  };

  const tableValues =
    ruleData.columns.length > 0
      ? ruleData.columns
          .map((col) => {
            let content = "";
            if (col.type === "list") {
              // Si c'est une liste, on mappe les valeurs pour n'afficher que la propriété 'value'
              content = col.values.map((v) => v.value).join("<br>");
            } else {
              // Sinon, on affiche le nom du type (par exemple "Texte libre")
              content = `<i>${typeDisplayMap[col.type] || col.type}</i>`;
            }
            return `<td>${content}</td>`;
          })
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
            <button id="reorder-columns-btn" class="button-secondary ${ruleData.editMode === "reorder" ? "active-mode" : ""}">Réorganiser colonnes</button>
            <button id="delete-column-mode-btn" class="button-secondary ${ruleData.editMode === "delete" ? "active-mode" : ""}">Supprimer colonne</button>
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

// fonction pour créer une colonne de nommage

function renderAddColumnModal(onConfirmCallback) {
  // Crée l'overlay et le contenu de la modale
  const modalOverlay = document.createElement("div");
  modalOverlay.className = "modal-overlay";
  modalOverlay.id = "add-column-modal-overlay";

  modalOverlay.innerHTML = `
    <div class="modal-content">
        <h2>Ajouter une nouvelle colonne</h2>

        <div class="modal-form-grid">
            <div class="form-group">
                <label for="column-name">Nom de la colonne</label>
                <input type="text" id="column-name" placeholder="Ex: Phase">
            </div>

            <div class="form-group">
                <label>Type de données</label>
                <div class="checkbox-group">
                    <label><input type="radio" name="column-type" value="text"> Texte libre</label>
                    <label><input type="radio" name="column-type" value="list"> Liste</label>
                    <label><input type="radio" name="column-type" value="number1"> 1 chiffre</label>
                    <label><input type="radio" name="column-type" value="number2"> 2 chiffres</label>
                    <label><input type="radio" name="column-type" value="number3"> 3 chiffres</label>
                    <label><input type="radio" name="column-type" value="trigram"> Trigramme</label>
                </div>
            </div>

            <div class="form-group">
                <label>Obligatoire</label>
                <div class="checkbox-group">
                    <label><input type="radio" name="column-required" value="yes" checked> Oui</label>
                    <label><input type="radio" name="column-required" value="no"> Non</label>
                </div>
            </div>
        </div>

        <!-- Section pour la liste, initialement cachée -->
        <div id="list-values-section" class="form-section" style="display: none;">
            <h4>Valeurs de la liste</h4>
            <div class="list-values-table-wrapper">
                <table id="list-values-table">
                    <thead>
                        <tr>
                            <th>Valeur</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><input type="text" placeholder="Ex: APD"></td>
                            <td><input type="text" placeholder="Ex: Avant-Projet Détaillé"></td>
                        </tr>
                        <!-- D'autres lignes peuvent être ajoutées dynamiquement ici -->
                    </tbody>
                </table>
            </div>
             <button id="add-list-row-btn" class="button-small">Ajouter une ligne</button>
        </div>


        <div class="modal-actions">
            <button id="cancel-add-column-btn" class="button-secondary">Annuler</button>
            <button id="confirm-add-column-btn" class="button-primary">Ajouter la colonne</button>
        </div>
    </div>
  `;

  document.body.appendChild(modalOverlay);

  // Logique pour fermer la modale
  const closeModal = () => modalOverlay.remove();
  modalOverlay
    .querySelector("#cancel-add-column-btn")
    .addEventListener("click", closeModal);
  modalOverlay
    .querySelector("#confirm-add-column-btn")
    .addEventListener("click", () => {
      // 1. Lire toutes les données du formulaire de la modale
      const name = modalOverlay.querySelector("#column-name").value.trim();
      if (!name) {
        alert("Veuillez donner un nom à la colonne.");
        return;
      }

      const type = modalOverlay.querySelector(
        'input[name="column-type"]:checked',
      ).value;
      const isRequired =
        modalOverlay.querySelector('input[name="column-required"]:checked')
          .value === "yes";

      let values = [];
      if (type === "list") {
        const listRows = modalOverlay.querySelectorAll(
          "#list-values-table tbody tr",
        );
        listRows.forEach((row) => {
          const valueInput = row.cells[0].querySelector("input");
          const descInput = row.cells[1].querySelector("input");
          if (valueInput.value.trim()) {
            values.push({
              value: valueInput.value.trim(),
              description: descInput.value.trim(),
            });
          }
        });
      }

      // 2. Construire l'objet de la nouvelle colonne
      const newColumn = {
        name: name,
        type: type,
        required: isRequired,
        values: values, // sera un tableau vide si le type n'est pas 'list'
      };

      // 3. Appeler la fonction de callback avec les nouvelles données
      onConfirmCallback(newColumn);

      // 4. Fermer la modale
      closeModal();
    });

  // Logique pour ajouter une ligne à la table des valeurs
  const addListRowBtn = modalOverlay.querySelector("#add-list-row-btn");
  const listTableBody = modalOverlay.querySelector("#list-values-table tbody");

  addListRowBtn.addEventListener("click", () => {
    const newRow = listTableBody.insertRow(); // Crée un <tr> à la fin du <tbody>
    newRow.innerHTML = `
        <td><input type="text" placeholder="Nouvelle valeur"></td>
        <td><input type="text" placeholder="Description (optionnel)"></td>
    `;
  });

  // Logique pour afficher/cacher la table de liste
  modalOverlay
    .querySelectorAll('input[name="column-type"]')
    .forEach((radio) => {
      radio.addEventListener("change", (event) => {
        const listSection = modalOverlay.querySelector("#list-values-section");
        listSection.style.display =
          event.target.value === "list" ? "block" : "none";
      });
    });
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
  renderAddColumnModal,
};
