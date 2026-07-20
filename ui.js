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
  const typeDisplayMap = {
    text: "Texte libre",
    list: "Liste",
    number1: "1 chiffre",
    number2: "2 chiffres",
    number3: "3 chiffres",
    trigram: "Trigramme",
  };

  const typeColorMap = {
    text: "#EBF5FB", // Bleu très clair
    list: "#E8F8F5", // Vert très clair
    numeric: "#FEF9E7", // Jaune très clair
    alphabetic: "#FDEDEC", // Rouge très clair
  };

  const typeNameMap = {
    text: "Texte libre",
    list: "Liste",
    numeric: "Numérique",
    alphabetic: "Alphabétique",
  };
  // Définition du texte d'aide
  let editModeDescription = "";
  if (ruleData.editMode === "reorder") {
    editModeDescription =
      'Cliquer-glisser les en-têtes de colonnes pour les réorganiser. Cliquer de nouveau sur "Réorganiser colonnes" pour valider la réorganisation';
  } else if (ruleData.editMode === "delete") {
    editModeDescription =
      'Cliquer sur l\'icône de "poubelle" pour marquer une colonne à supprimer. Cliquer à nouveau sur le bouton "Supprimer colonne" pour valider la suppresion.';
  }

  // Ajoute une classe CSS lorsque le mode réorganisation est actif
  const tableWrapperClass =
    ruleData.editMode === "reorder" ? "reorder-mode" : "";
  // Le bouton "Modifier" ne s'affiche que s'il y a des colonnes
  const editButtonHtml =
    ruleData.columns.length > 0
      ? `<button id="edit-column-btn" class="button-secondary ${ruleData.editMode === "select_for_edit" ? "active-mode" : ""}">Modifier une colonne</button>`
      : "";
  const tableHeaders =
    ruleData.columns.length > 0
      ? ruleData.columns
          .map((col, index) => {
            const deleteIcon =
              ruleData.editMode === "delete"
                ? `<span class="delete-column-icon" data-column-index="${index}">&#128465;</span>`
                : "";

            let constraints = [];
            if (col.required) constraints.push("Obligatoire");

            if (col.lengthConstraint && col.lengthConstraint.type !== "none") {
              const lc = col.lengthConstraint;
              switch (lc.type) {
                case "exact":
                  constraints.push(`Exact. ${lc.value1} car.`);
                  break;
                case "min":
                  constraints.push(`Min. ${lc.value1} car.`);
                  break;
                case "max":
                  constraints.push(`Max. ${lc.value1} car.`);
                  break;
                case "range":
                  constraints.push(`${lc.value1}-${lc.value2} car.`);
                  break;
              }
            }
            if (col.case && col.case !== "any") {
              constraints.push(
                col.case === "upper" ? "Majuscules" : "Minuscules",
              );
            }
            const constraintText =
              constraints.length > 0
                ? `<div style="color: #005a70; font-style: italic; font-size: 0.8em; margin-bottom: 4px;">${constraints.join(", ")}</div>`
                : "";

            // --- Logique pour les contrôles de séparateur ---
            let separatorControlsHtml = "";
            if (index < ruleData.columns.length - 1) {
              const currentSeparator = col.separator;
              const isChecked = currentSeparator !== null;

              separatorControlsHtml = `
                  <div class="separator-controls" style="position: absolute; top: 5px; right: -25px; z-index: 10;">
                      <label style="font-size: 0.8em; display: block; text-align: center; margin-bottom: 2px;">Séparateur</label>
                      <input type="checkbox" class="separator-checkbox" data-col-index="${index}" ${isChecked ? "checked" : ""}>
                      <select class="separator-select" data-col-index="${index}" ${!isChecked ? "disabled" : ""}>
                          <option value="-" ${currentSeparator === "-" ? "selected" : ""}>-</option>
                          <option value="_" ${currentSeparator === "_" ? "selected" : ""}>_</option>
                          <option value="." ${currentSeparator === "." ? "selected" : ""}>.</option>
                      </select>
                  </div>
              `;
            }
            // --- Fin de la logique ---

            const isSelected = ruleData.selectedColumnIndex === index;
            const thClass = `
              ${ruleData.editMode === "normal" ? "clickable-header" : ""}
              ${isSelected ? "selected" : ""}
              ${ruleData.editMode === "select_for_edit" ? "clickable-header" : ""}
              ${ruleData.editMode === "reorder" ? "draggable-column" : ""}
              ${col.markedForDeletion ? "marked-for-deletion" : ""}
          `;
            const bgColor = typeColorMap[col.type] || "";

            // On ajoute un padding à droite pour faire de la place aux contrôles
            const style = `background-color: ${bgColor}; position: relative; padding-right: 60px;`;

            return `<th class="${thClass}" style="${style}">
                      ${constraintText}
                      <div class="th-content-wrapper">${deleteIcon}${col.name}</div>
                      ${separatorControlsHtml}
                  </th>`;
          })
          .join("")
      : "<th>(Aucune colonne)</th>";

  // Créer une liste unique pour la légende
  const legendTypes = [...new Set(Object.values(typeNameMap))];

  const legendHtml = legendTypes
    .map((typeName) => {
      const typeKey = Object.keys(typeNameMap).find(
        (key) => typeNameMap[key] === typeName,
      );
      const color = typeColorMap[typeKey];
      return `<span style="display: inline-flex; align-items: center; margin-right: 15px;">
                <span style="width: 12px; height: 12px; background-color: ${color}; border: 1px solid #ccc; margin-right: 5px;"></span>
                ${typeName}
            </span>`;
    })
    .join("");
  const tableValues =
    ruleData.columns.length > 0
      ? ruleData.columns
          .map((col) => {
            const tdClass = col.markedForDeletion ? "marked-for-deletion" : "";
            const bgColor = typeColorMap[col.type] || "";
            let content = "";
            if (col.type === "list") {
              content = col.values.map((v) => v.value).join("<br>");
            } else {
              content = `<i>${typeDisplayMap[col.type] || col.type}</i>`;
            }
            return `<td class="${tdClass}" style="background-color: ${bgColor};">${content}</td>`;
          })
          .join("")
      : "<td></td>";

  container.innerHTML = `
    <div class="naming-rule-creation-container">
        <h1>${pageTitle}</h1>
<div class="naming-rule-legend" style="margin-bottom: 10px; font-size: 0.9em;">
    ${legendHtml}
</div>
        <div class="form-section">
            <label for="naming-rule-name">Affecter un nom à la convention de nommage :</label>
            <input type="text" id="naming-rule-name" value="${ruleData.name || ""}" placeholder="Ex: Convention principale">
        </div>
        
        <div class="naming-rule-actions">
            <button id="add-column-btn" class="button-secondary">Ajouter une colonne</button>
            ${editButtonHtml}
            <button id="reorder-columns-btn" class="button-secondary ${ruleData.editMode === "reorder" ? "active-mode" : ""}">Réorganiser colonnes</button>
            <button id="delete-column-mode-btn" class="button-secondary ${ruleData.editMode === "delete" ? "active-mode" : ""}">Supprimer colonne</button>
            <span class="edit-mode-description">${editModeDescription}</span>
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
    <div class="naming-rule-summary" style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #eee;">
    <h3>Estimation de la longueur</h3>
    <p><strong>Longueur totale (champs obligatoires) :</strong> <span id="total-chars-required">0</span></p>
    <p><strong>Longueur totale (tous les champs) :</strong> <span id="total-chars-all">0</span></p>
  </div>
  `;
}

// fonction pour créer une colonne de nommage

function renderAddColumnModal(onConfirmCallback) {
  const modalOverlay = document.createElement("div");
  modalOverlay.className = "modal-overlay";
  modalOverlay.id = "add-column-modal-overlay";

  modalOverlay.innerHTML = `
        <div class="modal-content">
            <h2>Ajouter une nouvelle colonne</h2>

            <!-- === Section 1: Informations de base === -->
            <div class="modal-form-grid">
                <div class="form-group">
                    <label for="column-name">Nom de la colonne</label>
                    <input type="text" id="column-name" placeholder="Ex: Phase">
                </div>
                <div class="form-group">
                    <label>Type de données</label>
                    <select id="column-type-select" class="form-control">
                        <option value="text">Texte Libre</option>
                        <option value="list">Liste</option>
                        <option value="numeric">Numérique</option>
                        <option value="alphabetic">Alphabétique</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Obligatoire</label>
                    <div class="checkbox-group">
                        <label><input type="radio" name="column-required" value="yes" checked> Oui</label>
                        <label><input type="radio" name="column-required" value="no"> Non</label>
                    </div>
                </div>
            </div>

            <!-- === Section 2: Contraintes (conditionnelles) === -->
            <div id="constraints-section" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                
                <!-- Contrainte de longueur -->
                <div id="length-constraint-section" class="form-section" style="display: none;">
                    <label for="length-constraint-type">Contrainte de longueur</label>
                    <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                        <select id="length-constraint-type">
                            <option value="none">Aucune</option>
                            <option value="exact">Exactement</option>
                            <option value="min">Minimum</option>
                            <option value="max">Maximum</option>
                            <option value="range">Entre</option>
                        </select>
                        <input type="number" id="length-value1" min="1" style="width: 70px; display: none;">
                        <span id="length-range-separator" style="display: none;">et</span>
                        <input type="number" id="length-value2" min="1" style="width: 70px; display: none;">
                    </div>
                </div>

                <!-- Contrainte de casse -->
                <div id="case-constraint-section" class="form-section" style="display: none;">
                    <label for="case-constraint-select">Contrainte de casse</label>
                    <select id="case-constraint-select">
                        <option value="any">Indifférent</option>
                        <option value="upper">Majuscules uniquement</option>
                        <option value="lower">Minuscules uniquement</option>
                    </select>
                </div>
            </div>

            <!-- === Section 3: Valeurs de la liste (conditionnelle) === -->
            <div id="list-values-section" class="form-section" style="display: none;">
                <h4>Valeurs de la liste</h4>
                <div class="list-values-table-wrapper">
                    <table id="list-values-table">
                        <thead><tr><th>Valeur</th><th>Description</th></tr></thead>
                        <tbody><tr><td><input type="text"></td><td><input type="text"></td></tr></tbody>
                    </table>
                </div>
                <button id="add-list-row-btn" class="button-small">Ajouter une ligne</button>
            </div>

            <!-- === Actions === -->
            <div class="modal-actions">
                <button id="cancel-add-column-btn" class="button-secondary">Annuler</button>
                <button id="confirm-add-column-btn" class="button-primary">Ajouter la colonne</button>
            </div>
        </div>
    `;
  document.body.appendChild(modalOverlay);

  // --- Logique de la modale ---
  const typeSelect = modalOverlay.querySelector("#column-type-select");
  const listSection = modalOverlay.querySelector("#list-values-section");
  const constraintsSection = modalOverlay.querySelector("#constraints-section");
  const lengthSection = modalOverlay.querySelector(
    "#length-constraint-section",
  );
  const caseSection = modalOverlay.querySelector("#case-constraint-section");
  const lengthTypeSelect = modalOverlay.querySelector(
    "#length-constraint-type",
  );
  const lengthValue1 = modalOverlay.querySelector("#length-value1");
  const lengthValue2 = modalOverlay.querySelector("#length-value2");
  const rangeSeparator = modalOverlay.querySelector("#length-range-separator");

  // Gère l'affichage des sections en fonction du type de données
  const toggleSections = () => {
    const type = typeSelect.value;
    const showLength = ["text", "numeric", "alphabetic"].includes(type);
    const showCase = type === "alphabetic";
    const showList = type === "list";

    constraintsSection.style.display =
      showLength || showCase ? "block" : "none";
    lengthSection.style.display = showLength ? "block" : "none";
    caseSection.style.display = showCase ? "block" : "none";
    listSection.style.display = showList ? "block" : "none";
  };

  // Gère l'affichage des champs de valeur de longueur
  const toggleLengthInputs = () => {
    const constraintType = lengthTypeSelect.value;
    lengthValue1.style.display = ["exact", "min", "max", "range"].includes(
      constraintType,
    )
      ? "inline-block"
      : "none";
    rangeSeparator.style.display =
      constraintType === "range" ? "inline-block" : "none";
    lengthValue2.style.display =
      constraintType === "range" ? "inline-block" : "none";
  };

  typeSelect.addEventListener("change", toggleSections);
  lengthTypeSelect.addEventListener("change", toggleLengthInputs);
  toggleSections(); // Appel initial

  // Logique pour la liste
  modalOverlay
    .querySelector("#add-list-row-btn")
    .addEventListener("click", () => {
      const tableBody = modalOverlay.querySelector("#list-values-table tbody");
      tableBody.insertRow().innerHTML = `<td><input type="text"></td><td><input type="text"></td>`;
    });

  // Logique de confirmation
  modalOverlay
    .querySelector("#confirm-add-column-btn")
    .addEventListener("click", () => {
      const name = modalOverlay.querySelector("#column-name").value.trim();
      if (!name) {
        alert("Veuillez donner un nom à la colonne.");
        return;
      }

      const type = typeSelect.value;
      const isRequired =
        modalOverlay.querySelector('input[name="column-required"]:checked')
          .value === "yes";

      // Lecture des contraintes
      const lengthConstraint = {
        type: lengthTypeSelect.value,
        value1:
          lengthTypeSelect.value !== "none"
            ? parseInt(lengthValue1.value, 10) || null
            : null,
        value2:
          lengthTypeSelect.value === "range"
            ? parseInt(lengthValue2.value, 10) || null
            : null,
      };

      const caseConstraint =
        type === "alphabetic"
          ? modalOverlay.querySelector("#case-constraint-select").value
          : null;

      // Lecture des valeurs de la liste
      let values = [];
      if (type === "list") {
        modalOverlay
          .querySelectorAll("#list-values-table tbody tr")
          .forEach((row) => {
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

      const newColumn = {
        name,
        type,
        required: isRequired,
        lengthConstraint,
        case: caseConstraint,
        values,
      };

      onConfirmCallback(newColumn);
      modalOverlay.remove();
    });

  modalOverlay
    .querySelector("#cancel-add-column-btn")
    .addEventListener("click", () => modalOverlay.remove());
}

function renderManageNamingRulesPage(container, rules) {
  const tableRows =
    rules.length > 0
      ? rules
          .map(
            (rule) => `
        <tr>
          <td>${rule.name}</td>
          <td>${rule.columns.length}</td>
          <td>${rule.columns.map((c) => c.name).join(", ")}</td>
          <td class="actions-cell">
            <button class="button-secondary button-small edit-rule-btn" data-rule-name="${rule.name}">Modifier</button>
            <button class="button-danger button-small delete-rule-btn" data-rule-name="${rule.name}">Supprimer</button>
          </td>
        </tr>
      `,
          )
          .join("")
      : '<tr><td colspan="4" style="text-align:center;">Aucune codification configurée.</td></tr>';

  container.innerHTML = `
    <div class="management-page-container">
      <h1>Gestion des Codifications de Nommage</h1>
      <div class="management-table-wrapper">
        <table class="management-table">
          <thead>
            <tr>
              <th>Nom de la Codification</th>
              <th>Nombre de colonnes</th>
              <th>Colonnes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
      <div class="form-actions">
        <button id="back-to-config-btn" class="button-secondary">Retour à la Configuration</button>
      </div>
    </div>
  `;
}

// FONCTION pour affectation des conventions aux dossiers
function renderAssignNamingPage(container, projectName) {
  container.innerHTML = `
    <div class="affectation-page-container">
      <h1>Affectation d'une codification à un dossier</h1>
      <p>Projet : <strong>${projectName}</strong></p>

      <div class="affectation-layout-grid">
        <div class="folder-browser-container">
          <ul id="folder-tree-root" class="folder-tree">
            <li class="loading-node">Chargement de l'arborescence...</li>
          </ul>
        </div>
        <div id="assignment-panel" class="assignment-panel">
          <div class="assignment-panel-placeholder">
            <p>Veuillez sélectionner un dossier pour lui affecter une codification.</p>
          </div>
        </div>
      </div>

      <div class="form-actions">
        <button id="back-to-config-btn" class="button-secondary">Retour à la Configuration</button>
        <button id="save-all-assignments-btn" class="button-primary">Sauvegarder les affectations</button>
      </div>
    </div>
  `;
}

//  FONCTION pour affectation des conventions aux dossiers
function updateAssignmentPanel(folder, allRuleNames, currentAssignedRule) {
  const panel = document.getElementById("assignment-panel");
  if (!panel) return;

  const ruleOptions = allRuleNames
    .map(
      (name) =>
        `<option value="${name}" ${name === currentAssignedRule ? "selected" : ""}>${name}</option>`,
    )
    .join("");

  panel.innerHTML = `
    <div class="assignment-panel-content">
      <h3>Dossier Sélectionné</h3>
      <p class="selected-folder-name">${folder.name}</p>
      <div class="form-group">
        <label for="rule-assignment-select">Codification à affecter :</label>
        <select id="rule-assignment-select">
          <option value="">-- Aucune codification --</option>
          ${ruleOptions}
        </select>
      </div>
      <div class="heredity-checkbox-container" title="Si coché, la codification sera appliquée à ce dossier et à tous ses sous-dossiers.">
        <input type="checkbox" id="heredity-checkbox">
        <label for="heredity-checkbox">Appliquer l'hérédité</label>
      </div>
    </div>
  `;
}

function validatePart(value, rule) {
  // 1. Gérer le cas "non obligatoire"
  if (!rule.required && !value) {
    return { isValid: true }; // Si la valeur est vide et non requise, c'est valide.
  }

  // 2. Gérer le cas "obligatoire" mais vide
  if (rule.required && !value) {
    return { isValid: false, reason: "Valeur obligatoire manquante" };
  }

  // 3. Validation par type
  switch (rule.type) {
    case "text":
      return { isValid: true }; // Le texte libre est toujours valide s'il n'est pas vide
    case "list":
      const isValid = rule.values.some((v) => v.value === value);
      return {
        isValid,
        reason: isValid
          ? ""
          : `La valeur "${value}" n'est pas dans la liste autorisée.`,
      };
    case "number1":
      const isNumber1 = /^\d{1}$/.test(value);
      return {
        isValid: isNumber1,
        reason: isNumber1 ? "" : "Doit être un chiffre unique.",
      };
    case "number2":
      const isNumber2 = /^\d{2}$/.test(value);
      return {
        isValid: isNumber2,
        reason: isNumber2 ? "" : "Doit être composé de 2 chiffres.",
      };
    case "number3":
      const isNumber3 = /^\d{3}$/.test(value);
      return {
        isValid: isNumber3,
        reason: isNumber3 ? "" : "Doit être composé de 3 chiffres.",
      };
    case "trigram":
      const isTrigram = /^[A-Z]{3}$/.test(value);
      return {
        isValid: isTrigram,
        reason: isTrigram
          ? ""
          : "Doit être un trigramme en majuscules (3 lettres).",
      };
    default:
      return { isValid: true }; // Type inconnu, on ne bloque pas
  }
}

function renderControlPage(container, documentsByConvention, allRules) {
  if (Object.keys(documentsByConvention).length === 0) {
    container.innerHTML =
      "<h1>Contrôle des Nommages</h1><p>Aucun document trouvé dans les dossiers configurés.</p>";
    return;
  }

  let html = `
    <div class="control-page-header">
      <h1>Contrôle des Nommages</h1>
      <div class="export-actions">
        <button id="export-pdf-btn" class="button-secondary button-small">Exporter en PDF</button>
        <button id="export-excel-btn" class="button-secondary button-small">Exporter en Excel</button>
      </div>
    </div>
  `;

  for (const conventionName in documentsByConvention) {
    const conventionRules = allRules.find((r) => r.name === conventionName);
    const documents = documentsByConvention[conventionName];

    html += `
      <div class="control-convention-section">
        <h2>Convention : ${conventionName}</h2>
        ${renderNamingControlTable(documents, conventionRules)}
      </div>
    `;
  }
  container.innerHTML = html;
}

function renderNamingControlTable(documents, conventionRules) {
  if (!conventionRules || conventionRules.columns.length === 0) {
    return "<p>Cette convention n'a pas de colonnes définies.</p>";
  }

  const headers = conventionRules.columns
    .map((col) => `<th>${col.name}</th>`)
    .join("");

  const rows = documents
    .map((doc) => {
      // On doit transformer le nom en majuscules AVANT de le séparer si la règle est 'trigram'
      const nameForParsing = doc.name.replace(/\.[^/.]+$/, ""); // Enlève l'extension
      // Créer une expression régulière basée sur tous les séparateurs possibles dans la convention
      const usedSeparators = conventionRules.columns
        .map((c) => c.separator)
        .filter((sep) => sep === "-" || sep === "_" || sep === "."); // Filtre pour la sécurité

      const uniqueSeparators = [...new Set(usedSeparators)];

      // Si aucun séparateur n'est utilisé, on ne peut pas splitter.
      const parts =
        uniqueSeparators.length > 0
          ? nameForParsing.split(new RegExp(`[${uniqueSeparators.join("")}]`))
          : [nameForParsing];

      const cells = conventionRules.columns
        .map((colRule, index) => {
          let value = parts[index] || "";

          // Pour les trigrammes, on s'assure que la valeur de comparaison est en majuscule
          if (colRule.type === "trigram") {
            value = value.toUpperCase();
          }

          const validationResult = validatePart(value, colRule);
          const cellClass = validationResult.isValid ? "" : "invalid-cell";
          const tooltipTitle = validationResult.isValid
            ? ""
            : `title="${validationResult.reason}"`;

          return `<td class="${cellClass}" ${tooltipTitle}>${value}</td>`;
        })
        .join("");

      return `
      <tr>
        <td class="depositor-cell">${doc.depositor}</td>
        ${cells}
      </tr>
    `;
    })
    .join("");

  return `
    <div class="control-table-wrapper">
      <table class="control-table">
        <thead>
          <tr>
            <th class="depositor-cell">Dépositaire</th>
            ${headers}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

// fonction d'aide à la codification
function renderHelpCodificationPage(container) {
  container.innerHTML = `
    <h1>Aide à la Codification</h1>
    <p>Déposez votre document et sélectionnez un dossier de destination pour commencer.
  <span style="font-style: italic; color: #c9302c; margin-left: 10px;">
    (seuls les dossiers où vous avez une autorisation de dépôt sont affichés)
  </span></p>
    <div class="help-page-layout">
      <!-- Zone de dépôt de fichier -->
      <div id="file-drop-zone" class="drop-zone">
        <span id="drop-zone-text">Glissez-déposez un fichier ici ou cliquez pour en sélectionner un.</span>
        <input type="file" id="file-upload-input" style="display: none;">
      </div>

      <!-- Arborescence des dossiers -->
      <div class="folder-browser-container">
        <div class="folder-legend">
          <span class="legend-item"><span class="color-box allowed"></span> Dossier avec droit de dépot</span>
          <span class="legend-item"><span class="color-box path"></span> Dossier Parent contenant des dossiers avec droit de dépot</span>
        </div>
        <ul id="folder-tree-root" class="folder-tree">
          <li>Chargement des dossiers...</li>
        </ul>
      </div>
    </div>

    <!-- Zone de nommage (initialement vide) -->
    <div id="naming-zone-container"></div>
    
    <!-- Bouton final (initialement désactivé) -->
    <div class="final-action-container">
        <button id="upload-document-btn" class="button-primary" disabled>Déposer le document</button>
    </div>
  `;
}

function renderNamingZone(container, convention) {
  const typeDisplayMap = {
    text: "Texte libre",
    list: "Sélectionner...",
    number1: "1 chiffre (ex: 3)",
    number2: "2 chiffres (ex: 07)",
    number3: "3 chiffres (ex: 101)",
    trigram: "3 lettres (ex: ARC)",
  };
  const createPlaceholder = (col) => {
    let parts = [];
    switch (col.type) {
      case "numeric":
        parts.push("ex: 123");
        break;
      case "alphabetic":
        parts.push("ex: ABC");
        break;
      case "text":
        parts.push("Texte libre");
        break;
      case "list":
        parts.push("Sélectionner...");
        break;
    }

    if (col.lengthConstraint && col.lengthConstraint.type !== "none") {
      const lc = col.lengthConstraint;
      switch (lc.type) {
        case "exact":
          parts.push(`long. ${lc.value1}`);
          break;
        case "min":
          parts.push(`min. ${lc.value1} car.`);
          break;
        case "max":
          parts.push(`max. ${lc.value1} car.`);
          break;
        case "range":
          parts.push(`${lc.value1}-${lc.value2} car.`);
          break;
      }
    }
    if (col.case === "upper") parts.push("Maj");
    if (col.case === "lower") parts.push("Min");

    return parts.join(", ");
  };

  const fieldsHtml = convention.columns
    .map((col, index) => {
      const placeholder = createPlaceholder(col);
      const isRequired = col.required
        ? ' <span class="required-asterisk">*</span>'
        : "";
      let inputHtml = "";

      if (col.type === "list" && col.values.length > 0) {
        const options = col.values
          .map(
            (v) =>
              `<option value="${v.value}" title="${v.description}">${v.value}</option>`,
          )
          .join("");
        inputHtml = `<select class="naming-input" data-index="${index}">
                     <option value="">-- ${placeholder} --</option>
                     ${options}
                   </select>`;
      } else {
        inputHtml = `<input type="text" class="naming-input" data-index="${index}" placeholder="${placeholder}">`;
      }

      return `
      <div class="naming-field-wrapper">
        <label>${col.name}${isRequired}</label>
        <div class="naming-field">
          ${inputHtml}
        </div>
      </div>
    `;
    })
    .join("");

  container.innerHTML = `
    <h3>Construisez le nom de votre document :</h3>
    <div class="naming-zone">
      ${fieldsHtml}
    </div>
    <div class="naming-preview" style="display: flex; justify-content: space-between; align-items: center;">
    <div>
        <strong>Aperçu : </strong>
        <span id="final-name-preview"></span>
    </div>
    <div>
        <strong>Caractères : </strong>
        <span id="final-name-char-count">0</span>
    </div>
</div>
  `;
}

// Exporter toutes les fonctions
export {
  renderLoading,
  renderError,
  renderWelcome,
  renderSaving,
  renderSuccess,
  renderHomePageWithButtons,
  renderConfigPage,
  renderNamingConfigSummaryTable,
  renderCreateNamingRulePage,
  renderAddColumnModal,
  renderManageNamingRulesPage,
  renderAssignNamingPage,
  updateAssignmentPanel,
  renderControlPage,
  renderHelpCodificationPage,
  renderNamingZone,
};
