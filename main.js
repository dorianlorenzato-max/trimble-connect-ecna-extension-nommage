// On importe les fonctions depuis nos modules
import {
  saveConfigurationFile,
  fetchConfigurationFile,
  fetchFolderContents,
  fetchLoggedInUserDetails,
  getRootFolders,
  getConfigFolderId,
  findOrCreateFolder,
  getProjectRootId,
  fetchUserProjectRole,
  fetchProjectGroups,
  fetchAllProjectFolders,
  recursivelyFetchAllSubfolders,
} from "./api.js";
import {
  renderLoading,
  renderError,
  renderSaving,
  renderSuccess,
  renderConfigPage,
  renderNamingConfigSummaryTable,
  renderHomePageWithButtons,
  renderCreateNamingRulePage,
  renderAddColumnModal,
  renderManageNamingRulesPage,
  renderAssignNamingPage,
  updateAssignmentPanel,
} from "./ui.js";

// Exécution dans une fonction auto-appelée pour ne pas polluer l'espace global
(async function () {
  const mainContentDiv = document.getElementById("mainContent");
  const CONFIG_FOLDER_NAME = "Configuration_Nommage"; // Nouveau nom de dossier de configuration
  const NAMING_CONFIG_FILENAME = "naming-rules-config.json"; // Nom du fichier de configuration des règles de nommage
  const NAMING_ASSIGNMENTS_FILENAME = "naming-assignments.json"; // Nom du fichier d'affectation des nommages

  let triconnectAPI;
  let globalAccessToken = null;
  let configFolderId = null;
  let currentProjectId = null;
  let isAdmin = false; // Variable pour stocker le statut administrateur
  let currentRuleState = null; //  notre variable d'état pour la gestions de colonnes de convention de nommage
  let originalRuleNameToEdit = null;

  // --- INITIALISATION DE L'EXTENSION ---
  try {
    renderLoading(mainContentDiv);
    triconnectAPI = await TrimbleConnectWorkspace.connect(
      window.parent,
      (event, data) => {},
      30000,
    );

    globalAccessToken =
      await triconnectAPI.extension.requestPermission("accesstoken");
    if (!globalAccessToken) throw new Error("L'Access Token est invalide.");
    console.warn("Access Token récupéré au démarrage :", globalAccessToken);

    const projectInfo = await triconnectAPI.project.getCurrentProject();
    currentProjectId = projectInfo.id;

    // Vérifier le rôle de l'utilisateur au démarrage
    const userRole = await fetchUserProjectRole(
      currentProjectId,
      globalAccessToken,
    );
    isAdmin = userRole === "ADMIN";

    // Récupérer ou créer le dossier de configuration
    const projectRootId = await getProjectRootId(
      triconnectAPI,
      globalAccessToken,
    );
    configFolderId = await findOrCreateFolder(
      projectRootId,
      CONFIG_FOLDER_NAME,
      globalAccessToken,
    );
    if (!configFolderId)
      throw new Error(
        `Le dossier "${CONFIG_FOLDER_NAME}" est introuvable ou n'a pas pu être créé.`,
      );

    // Configuration du menu dans l'UI de Trimble Connect
    triconnectAPI.ui.setMenu({
      title: "ECNA Nommage Docs",
      icon: "https://dorianlorenzato-max.github.io/trimble-connect-ecna-extension/logoEiffage.png",
      command: "ecna_nommage_docs_clicked",
    });

    // Attacher les événements aux nouveaux boutons principaux de la bannière
    document
      .getElementById("helpNamingBtn")
      .addEventListener("click", handleHelpNamingClick);
    document
      .getElementById("controlNamingBtn")
      .addEventListener("click", handleControlNamingClick);
    document
      .getElementById("configNamingBtn")
      .addEventListener("click", handleConfigNamingRuleClick);

    // Afficher la page d'accueil avec les boutons
    renderHomePageWithButtons(mainContentDiv, isAdmin);
    attachHomePageButtonEvents(); // Attacher les événements aux boutons de la page d'accueil
  } catch (error) {
    console.error(
      "Erreur critique lors de l'initialisation de l'extension :",
      error,
    );
    renderError(mainContentDiv, error);
  }

  // --- GESTIONNAIRES D'ÉVÉNEMENTS POUR LES NOUVEAUX BOUTONS ---

  function attachHomePageButtonEvents() {
    document
      .getElementById("homeHelpNamingBtn")
      .addEventListener("click", handleHelpNamingClick);
    document
      .getElementById("homeControlNamingBtn")
      .addEventListener("click", handleControlNamingClick);
    document
      .getElementById("homeConfigNamingBtn")
      .addEventListener("click", handleConfigNamingRuleClick);
  }

  async function handleHelpNamingClick() {
    // Logique pour le bouton "Aide Codification"
    console.log("Clic sur Aide Codification");
    renderLoading(mainContentDiv); // Affiche un message de chargement
    // Ici, vous appelerez la fonction de rendu spécifique pour l'aide
    mainContentDiv.innerHTML =
      "<h2>Aide à la Codification (à développer)</h2><p>Contenu de l'aide...</p>";
  }

  async function handleControlNamingClick() {
    // Logique pour le bouton "Contrôle Nommage"
    console.log("Clic sur Contrôle Nommage");
    renderLoading(mainContentDiv); // Affiche un message de chargement
    // Ici, vous appelerez la fonction de rendu spécifique pour le contrôle
    mainContentDiv.innerHTML =
      "<h2>Contrôle des Nommages (à développer)</h2><p>Interface de contrôle...</p>";
  }

  async function handleConfigNamingRuleClick() {
    console.log("Clic sur Configuration Nommage");
    if (!isAdmin) {
      alert(
        "Accès refusé : Seuls les administrateurs peuvent configurer le nommage.",
      );
      renderHomePageWithButtons(mainContentDiv, isAdmin); // Revenir à la page d'accueil
      return;
    }
    renderLoading(mainContentDiv);

    try {
      // Rendre la page de configuration générale
      renderConfigPage(mainContentDiv, isAdmin);

      // Attacher les gestionnaires d'événements aux boutons de la page de configuration
      document
        .getElementById("create-naming-btn")
        .addEventListener("click", handleCreateNamingRuleClick);
      document
        .getElementById("manage-naming-btn")
        .addEventListener("click", handleManageNamingRulesClick);
      document
        .getElementById("assign-naming-btn")
        .addEventListener("click", handleAssignNamingRulesClick);

      // Charger et rendre le tableau récapitulatif
      await loadAndRenderNamingSummary();
    } catch (error) {
      console.error(
        "Erreur lors de l'affichage de la page de configuration:",
        error,
      );
      renderError(mainContentDiv, error);
    }
  }

  async function handleManageNamingRulesClick() {
    renderLoading(mainContentDiv);
    try {
      const config = await fetchConfigurationFile(
        globalAccessToken,
        configFolderId,
        NAMING_CONFIG_FILENAME,
      );
      const rules = config ? config.rules : [];
      renderManageNamingRulesPage(mainContentDiv, rules);
      attachManageRulesEvents(rules); // On attache les événements pour les boutons
    } catch (error) {
      console.error("Erreur lors du chargement des règles de nommage :", error);
      renderError(mainContentDiv, error);
    }
  }

  // Fonction pour affecter une convention à des dossiers
  async function handleAssignNamingRulesClick() {
    if (!triconnectAPI || !globalAccessToken) {
      renderError(mainContentDiv, new Error("Extension non initialisée."));
      return;
    }

    renderLoading(mainContentDiv);
    try {
      const projectInfo = await triconnectAPI.project.getCurrentProject();

      const [namingConfig, assignmentsConfig, rootSubfolders] =
        await Promise.all([
          fetchConfigurationFile(
            globalAccessToken,
            configFolderId,
            NAMING_CONFIG_FILENAME,
          ),
          fetchConfigurationFile(
            globalAccessToken,
            configFolderId,
            NAMING_ASSIGNMENTS_FILENAME,
          ),
          getRootFolders(triconnectAPI, globalAccessToken),
        ]);

      // Stockage des données pour réutilisation
      const allNamingRules = namingConfig ? namingConfig.rules : [];
      const currentAssignments = assignmentsConfig || {};
      let pendingChanges = {}; // Pour suivre les modifs non sauvegardées

      renderAssignNamingPage(mainContentDiv, projectInfo.name);

      const treeRootElement = document.getElementById("folder-tree-root");
      treeRootElement.innerHTML = ""; // Vider l'arbre

      renderAndAttachFolderListeners(
        treeRootElement,
        rootSubfolders,
        allNamingRules,
        currentAssignments,
        pendingChanges,
      );

      document
        .getElementById("back-to-config-btn")
        .addEventListener("click", handleConfigNamingRuleClick);
      document
        .getElementById("save-all-assignments-btn")
        .addEventListener("click", () =>
          handleSaveAllAssignments(currentAssignments, pendingChanges),
        );
    } catch (error) {
      console.error(
        "Erreur lors du chargement de la page d'affectation :",
        error,
      );
      renderError(mainContentDiv, error);
    }
  }
  // Fonction de sauvagarde des conventions affectées
  async function handleSaveAllAssignments(currentAssignments, pendingChanges) {
    if (Object.keys(pendingChanges).length === 0) {
      alert("Aucune modification à sauvegarder.");
      return;
    }

    renderSaving(mainContentDiv);
    const finalAssignments = { ...currentAssignments, ...pendingChanges };

    try {
      await saveConfigurationFile(
        triconnectAPI,
        globalAccessToken,
        finalAssignments,
        NAMING_ASSIGNMENTS_FILENAME,
        configFolderId,
      );

      renderSuccess(
        mainContentDiv,
        "Les affectations ont été sauvegardées avec succès.",
      );
      // On recharge la page pour que les modifications soient prises en compte comme état de base
      setTimeout(handleAssignNamingRulesClick, 1500);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde des affectations:", error);
      renderError(mainContentDiv, error);
    }
  }
  //FONCTION pour la gestion d'affectation des conventions
  function displayFolderAssignmentDetails(
    folder,
    allNamingRules,
    currentAssignments,
    pendingChanges,
  ) {
    const assignedRuleName =
      pendingChanges[folder.id] ?? currentAssignments[folder.id] ?? null;
    const allRuleNames = allNamingRules.map((r) => r.name);

    updateAssignmentPanel(folder, allRuleNames, assignedRuleName);

    const selectElement = document.getElementById("rule-assignment-select");
    const heredityCheckbox = document.getElementById("heredity-checkbox");

    const applyChanges = async () => {
      const selectedRule = selectElement.value;
      // Mettre à jour la modification pour le dossier parent
      pendingChanges[folder.id] = selectedRule;

      // Appliquer l'hérédité si la case est cochée
      if (heredityCheckbox.checked && selectedRule) {
        console.log(
          `Application de l'hérédité pour le dossier ${folder.name}...`,
        );
        try {
          const allSubIds = await recursivelyFetchAllSubfolders(
            folder.id,
            globalAccessToken,
          );
          allSubIds.forEach((subId) => {
            pendingChanges[subId] = selectedRule;
          });
          console.log(
            `Hérédité appliquée à ${allSubIds.length} sous-dossier(s).`,
          );
        } catch (error) {
          console.error("Erreur lors de l'application de l'hérédité:", error);
        }
      }
    };

    selectElement.addEventListener("change", applyChanges);
    heredityCheckbox.addEventListener("change", applyChanges);
  }

  function renderAndAttachFolderListeners(
    parentElement,
    folders,
    allNamingRules,
    currentAssignments,
    pendingChanges,
  ) {
    if (!folders || folders.length === 0) {
      const noSubfolderItem = document.createElement("li");
      noSubfolderItem.className = "folder-item-empty";
      noSubfolderItem.textContent = "Aucun sous-dossier";
      parentElement.appendChild(noSubfolderItem);
      return;
    }

    folders.forEach((folder) => {
      const listItem = document.createElement("li");
      listItem.className = "folder-item";
      listItem.dataset.folderId = folder.id;
      listItem.dataset.folderName = folder.name;
      listItem.dataset.loaded = "false"; // Pour savoir si on a déjà chargé les sous-dossiers

      const folderNameSpan = document.createElement("span");
      folderNameSpan.className = "folder-name";
      folderNameSpan.textContent = folder.name;

      listItem.appendChild(folderNameSpan);
      parentElement.appendChild(listItem);

      folderNameSpan.addEventListener("click", async (event) => {
        event.stopPropagation();

        // Gère la surbrillance
        document
          .querySelectorAll(".folder-item.selected")
          .forEach((el) => el.classList.remove("selected"));
        listItem.classList.add("selected");

        // Affiche le panneau de droite
        displayFolderAssignmentDetails(
          { id: folder.id, name: folder.name },
          allNamingRules,
          currentAssignments,
          pendingChanges,
        );

        // Logique pour déplier/replier ou charger les sous-dossiers
        if (listItem.dataset.loaded === "true") {
          const subList = listItem.querySelector("ul");
          if (subList) {
            subList.style.display =
              subList.style.display === "none" ? "block" : "none";
          }
          return;
        }

        // Affiche un message de chargement
        const loadingSpan = document.createElement("span");
        loadingSpan.textContent = " (chargement...)";
        loadingSpan.style.fontStyle = "italic";
        folderNameSpan.appendChild(loadingSpan);

        try {
          const subFolders = await fetchFolderContents(
            folder.id,
            globalAccessToken,
          );
          const subList = document.createElement("ul");
          subList.className = "folder-tree";
          listItem.appendChild(subList);

          // Appel récursif pour les sous-dossiers
          renderAndAttachFolderListeners(
            subList,
            subFolders,
            allNamingRules,
            currentAssignments,
            pendingChanges,
          );

          listItem.dataset.loaded = "true";
        } catch (error) {
          console.error(`Erreur au chargement du dossier ${folder.id}`, error);
          folderNameSpan.textContent += " (erreur)";
        } finally {
          // Retire le message de chargement
          folderNameSpan.removeChild(loadingSpan);
        }
      });
    });
  }

  // FONCTION pour attacher les événements de la page de gestion
  function attachManageRulesEvents(rules) {
    document.querySelectorAll(".delete-rule-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        const ruleNameToDelete = event.target.dataset.ruleName;
        // La logique de suppression sera ajoutée ici
        if (
          confirm(
            `Êtes-vous sûr de vouloir supprimer la codification "${ruleNameToDelete}" ? Cette action est irréversible.`,
          )
        ) {
          handleDeleteNamingRule(ruleNameToDelete);
        }
      });
    });

    document.querySelectorAll(".edit-rule-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        const ruleNameToEdit = event.target.dataset.ruleName;
        handleEditNamingRule(ruleNameToEdit);
      });
    });

    document
      .getElementById("back-to-config-btn")
      .addEventListener("click", handleConfigNamingRuleClick);
  }

  async function handleEditNamingRule(ruleNameToEdit) {
    renderLoading(mainContentDiv);
    try {
      const config = await fetchConfigurationFile(
        globalAccessToken,
        configFolderId,
        NAMING_CONFIG_FILENAME,
      );
      const ruleToEdit = config.rules.find(
        (rule) => rule.name === ruleNameToEdit,
      );

      if (!ruleToEdit) {
        throw new Error(`La codification "${ruleNameToEdit}" est introuvable.`);
      }

      // On passe en mode édition
      originalRuleNameToEdit = ruleNameToEdit;

      // On initialise l'état avec les données de la règle à modifier
      currentRuleState = {
        name: ruleToEdit.name,
        columns: ruleToEdit.columns,
        editMode: "normal",
      };

      // On affiche la page de création/édition
      renderCreateNamingRulePage(mainContentDiv, currentRuleState);
      // On attache les écouteurs d'événements de cette page
      attachCreatePageListeners();
    } catch (error) {
      console.error(
        `Erreur lors de la préparation de l'édition pour "${ruleNameToEdit}":`,
        error,
      );
      renderError(mainContentDiv, error);
    }
  }

  async function handleDeleteNamingRule(ruleNameToDelete) {
    renderSaving(mainContentDiv);
    try {
      const existingConfig = await fetchConfigurationFile(
        globalAccessToken,
        configFolderId,
        NAMING_CONFIG_FILENAME,
      );

      if (!existingConfig || !existingConfig.rules) {
        throw new Error(
          "Impossible de récupérer la configuration pour la suppression.",
        );
      }

      // Appliquer le modèle Lire-Modifier-Écrire
      const updatedRules = existingConfig.rules.filter(
        (rule) => rule.name !== ruleNameToDelete,
      );
      const finalConfigurationData = { ...existingConfig, rules: updatedRules };

      await saveConfigurationFile(
        triconnectAPI,
        globalAccessToken,
        finalConfigurationData,
        NAMING_CONFIG_FILENAME,
        configFolderId,
      );

      renderSuccess(
        mainContentDiv,
        `La codification "${ruleNameToDelete}" a été supprimée.`,
      );
      setTimeout(handleManageNamingRulesClick, 1500); // Revenir à la page de gestion
    } catch (error) {
      console.error(
        `Échec de la suppression de la règle "${ruleNameToDelete}":`,
        error,
      );
      renderError(mainContentDiv, error);
    }
  }

  // FONCTION pour gerer les boutons de création de convention de nommage
  async function handleCreateNamingRuleClick() {
    originalRuleNameToEdit = null; // Assure qu'on est bien en mode création
    // Initialise l'état pour une nouvelle règle
    currentRuleState = {
      name: "",
      columns: [],
      editMode: "normal",
    };

    // Premier affichage de la page
    renderCreateNamingRulePage(mainContentDiv, currentRuleState);
    attachCreatePageListeners();
  }

  // fonction pour enregistrer la convention de nommage
  async function handleSaveNamingRuleClick() {
    // 1. Mettre à jour l'état avec la dernière valeur de l'input
    currentRuleState.name = document
      .getElementById("naming-rule-name")
      .value.trim();

    if (!currentRuleState.name) {
      alert("Veuillez donner un nom à la codification.");
      return;
    }

    renderSaving(mainContentDiv);

    try {
      const loggedInUser = await fetchLoggedInUserDetails(globalAccessToken);
      const userName =
        `${loggedInUser.firstName} ${loggedInUser.lastName}`.trim();
      const today = new Date().toISOString().split("T")[0];

      const existingConfig = await fetchConfigurationFile(
        globalAccessToken,
        configFolderId,
        NAMING_CONFIG_FILENAME,
      );
      const finalConfigurationData = existingConfig || { rules: [] };

      if (originalRuleNameToEdit) {
        // --- MODE ÉDITION ---
        const ruleIndex = finalConfigurationData.rules.findIndex(
          (rule) => rule.name === originalRuleNameToEdit,
        );
        if (ruleIndex === -1) throw new Error("Règle originale introuvable.");

        finalConfigurationData.rules[ruleIndex] = {
          ...finalConfigurationData.rules[ruleIndex],
          ...currentRuleState,
          modifiedBy: userName,
          modifiedAt: today,
        };
      } else {
        // --- MODE CRÉATION ---
        if (
          finalConfigurationData.rules.some(
            (rule) => rule.name === currentRuleState.name,
          )
        ) {
          alert(
            `Une codification nommée "${currentRuleState.name}" existe déjà.`,
          );
          renderCreateNamingRulePage(mainContentDiv, currentRuleState); // Ré-affiche avec les données actuelles
          attachCreatePageListeners();
          return;
        }
        finalConfigurationData.rules.push({
          ...currentRuleState,
          createdBy: userName,
          createdAt: today,
          modifiedBy: userName,
          modifiedAt: today,
        });
      }

      await saveConfigurationFile(
        triconnectAPI,
        globalAccessToken,
        finalConfigurationData,
        NAMING_CONFIG_FILENAME,
        configFolderId,
      );

      originalRuleNameToEdit = null; // Nettoyer l'état d'édition
      renderSuccess(
        mainContentDiv,
        `La codification "${currentRuleState.name}" a été enregistrée avec succès.`,
      );
      setTimeout(handleManageNamingRulesClick, 2000);
    } catch (error) {
      console.error(
        "Échec de la sauvegarde/modification de la codification:",
        error,
      );
      originalRuleNameToEdit = null;
      renderError(mainContentDiv, error);
    }
  }

  const onColumnAdd = (newColumn) => {
    currentRuleState.name = document.getElementById("naming-rule-name").value;
    currentRuleState.columns.push(newColumn);
    renderCreateNamingRulePage(mainContentDiv, currentRuleState);
    attachCreatePageListeners();
  };

  function attachCreatePageListeners() {
    document
      .getElementById("cancel-naming-rule-btn")
      .addEventListener("click", handleConfigNamingRuleClick);
    document
      .getElementById("save-naming-rule-btn")
      .addEventListener("click", handleSaveNamingRuleClick);

    document.getElementById("add-column-btn").addEventListener("click", () => {
      currentRuleState.name = document.getElementById("naming-rule-name").value;
      renderAddColumnModal(onColumnAdd);
    });

    const reorderBtn = document.getElementById("reorder-columns-btn");
    const deleteBtn = document.getElementById("delete-column-mode-btn");

    reorderBtn.addEventListener("click", () => {
      if (currentRuleState.columns.length === 0) {
        alert("Veuillez d'abord ajouter une colonne avant de réorganiser.");
        return;
      }
      currentRuleState.editMode =
        currentRuleState.editMode === "reorder" ? "normal" : "reorder";
      rerenderPage();
    });

    deleteBtn.addEventListener("click", () => {
      if (currentRuleState.columns.length === 0) {
        alert("Veuillez d'abord ajouter une colonne avant de supprimer.");
        return;
      }
      if (currentRuleState.editMode === "delete") {
        currentRuleState.columns = currentRuleState.columns.filter(
          (col) => !col.markedForDeletion,
        );
      }
      currentRuleState.editMode =
        currentRuleState.editMode === "delete" ? "normal" : "delete";
      rerenderPage();
    });

    if (currentRuleState.editMode === "delete") {
      document.querySelectorAll(".delete-column-icon").forEach((icon) => {
        icon.addEventListener("click", (event) => {
          const indexToMark = parseInt(event.target.dataset.columnIndex, 10);
          const column = currentRuleState.columns[indexToMark];
          column.markedForDeletion = !column.markedForDeletion;
          rerenderPage();
        });
      });
    }

    if (currentRuleState.editMode === "reorder") {
      const tableHeaderRow = document.querySelector(
        ".naming-rule-preview-table thead tr",
      );
      if (tableHeaderRow) {
        Sortable.create(tableHeaderRow, {
          animation: 150,
          onEnd: function (evt) {
            const [movedItem] = currentRuleState.columns.splice(
              evt.oldIndex,
              1,
            );
            currentRuleState.columns.splice(evt.newIndex, 0, movedItem);
            rerenderPage();
          },
        });
      }
    }
  }

  const rerenderPage = () => {
    currentRuleState.name = document.getElementById("naming-rule-name").value;
    renderCreateNamingRulePage(mainContentDiv, currentRuleState);
    attachCreatePageListeners();
  };
  // Fonction pour charger et rendre le tableau récapitulatif des codifications
  async function loadAndRenderNamingSummary() {
    const summaryContainer = document.getElementById(
      "naming-config-summary-container",
    );
    if (!summaryContainer) return; // S'assurer que le conteneur existe

    summaryContainer.innerHTML = `<p style="text-align:center; margin-top:20px;">Chargement du récapitulatif des codifications...</p>`;

    try {
      // Pour l'instant, on va simuler des données car la logique de sauvegarde n'est pas encore implémentée
      const namingConfig = await fetchConfigurationFile(
        globalAccessToken,
        configFolderId,
        NAMING_CONFIG_FILENAME,
      );
      const assignmentsConfig = await fetchConfigurationFile(
        globalAccessToken,
        configFolderId,
        NAMING_ASSIGNMENTS_FILENAME,
      );
      const allProjectFolders = await fetchAllProjectFolders(
        triconnectAPI,
        globalAccessToken,
      );

      const folderIdToNameMap = new Map(
        allProjectFolders.map((f) => [f.id, f.name]),
      );

      const allNamingRules = namingConfig?.rules || [];
      const allAssignments = assignmentsConfig || {};
      const assignmentsByRule = {};

      for (const folderId in allAssignments) {
        const ruleName = allAssignments[folderId];
        if (ruleName) {
          if (!assignmentsByRule[ruleName]) {
            assignmentsByRule[ruleName] = [];
          }
          const folderName = folderIdToNameMap.get(folderId);
          if (folderName) {
            assignmentsByRule[ruleName].push(folderName);
          }
        }
      }

      const summaryData = allNamingRules.map((rule) => ({
        ruleName: rule.name,
        affectedFolders: assignmentsByRule[rule.name] || [],
        date: rule.modifiedAt || rule.createdAt || "N/A",
        creator: rule.modifiedBy || rule.createdBy || "N/A",
      }));

      renderNamingConfigSummaryTable(summaryContainer, summaryData);
    } catch (error) {
      console.error(
        "Erreur lors du chargement du résumé des codifications :",
        error,
      );
      summaryContainer.innerHTML = `<p style="color: red; text-align:center; margin-top:20px;">Erreur lors du chargement des données : ${error.message}</p>`;
      renderError(mainContentDiv, error); // Affiche aussi l'erreur principale
    }
  }
})();
