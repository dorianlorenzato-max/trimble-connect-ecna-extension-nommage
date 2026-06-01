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
        .addEventListener("click", () =>
          console.log("Clic sur Gérer les codifications"),
        ); // Temporaire
      document
        .getElementById("assign-naming-btn")
        .addEventListener("click", () =>
          console.log("Clic sur Affecter les codifications"),
        ); // Temporaire

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

  // FONCTION pour gerer les boutons de création de convention de nommage
  async function handleCreateNamingRuleClick() {
    // Initialise l'état pour une nouvelle règle
    currentRuleState = {
      name: "",
      columns: [],
      editMode: "normal",
    };

    // Fonction interne pour attacher tous les écouteurs d'événements de cette page
    function attachCreatePageListeners() {
      document
        .getElementById("cancel-naming-rule-btn")
        .addEventListener("click", handleConfigNamingRuleClick);
      document
        .getElementById("save-naming-rule-btn")
        .addEventListener("click", handleSaveNamingRuleClick);
      document
        .getElementById("add-column-btn")
        .addEventListener("click", () => {
          // Sauvegarde le nom actuel avant d'ouvrir la modale pour ne pas le perdre
          currentRuleState.name =
            document.getElementById("naming-rule-name").value;
          renderAddColumnModal(onColumnAdd);
        });
      // --- Logique pour les boutons de mode ---
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

        // Si on quitte le mode suppression, on applique les suppressions
        if (currentRuleState.editMode === "delete") {
          currentRuleState.columns = currentRuleState.columns.filter(
            (col) => !col.markedForDeletion,
          );
        }

        currentRuleState.editMode =
          currentRuleState.editMode === "delete" ? "normal" : "delete";
        rerenderPage();
      });

      // --- Logique pour marquer une colonne pour suppression ---
      if (currentRuleState.editMode === "delete") {
        document.querySelectorAll(".delete-column-icon").forEach((icon) => {
          icon.addEventListener("click", (event) => {
            const indexToMark = parseInt(event.target.dataset.columnIndex, 10);
            const column = currentRuleState.columns[indexToMark];
            // On bascule l'état 'marqué pour suppression'
            column.markedForDeletion = !column.markedForDeletion;
            rerenderPage();
          });
        });
      }

      // --- Logique pour le glisser-déposer (Drag-and-Drop) ---
      if (currentRuleState.editMode === "reorder") {
        const tableHeaderRow = document.querySelector(
          ".naming-rule-preview-table thead tr",
        );
        if (tableHeaderRow) {
          Sortable.create(tableHeaderRow, {
            animation: 150,
            onEnd: function (evt) {
              // Réorganise le tableau des colonnes dans notre état
              const [movedItem] = currentRuleState.columns.splice(
                evt.oldIndex,
                1,
              );
              currentRuleState.columns.splice(evt.newIndex, 0, movedItem);
              // On ne quitte plus le mode, on redessine simplement
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

    // Callback: fonction qui sera appelée par la modale lors de la confirmation
    const onColumnAdd = (newColumn) => {
      currentRuleState.columns.push(newColumn);
      // Re-dessine la page de création avec les données mises à jour
      renderCreateNamingRulePage(mainContentDiv, currentRuleState);
      // Ré-attache les écouteurs car le DOM a été remplacé
      attachCreatePageListeners();
    };

    // Premier affichage de la page
    renderCreateNamingRulePage(mainContentDiv, currentRuleState);
    attachCreatePageListeners();
  }

  // fonction pour enregistrer la convention de nommage
  async function handleSaveNamingRuleClick() {
    // 1. Lire les données de l'interface
    const ruleNameInput = document.getElementById("naming-rule-name");
    currentRuleState.name = ruleNameInput.value.trim(); // Met à jour le nom dans l'état

    if (!currentRuleState.name) {
      alert("Veuillez donner un nom à la codification.");
      return;
    }

    renderSaving(mainContentDiv);

    try {
      // 2. Préparer les données
      const loggedInUser = await fetchLoggedInUserDetails(globalAccessToken);
      const userName =
        `${loggedInUser.firstName} ${loggedInUser.lastName}`.trim();
      const today = new Date().toISOString().split("T")[0]; // Format YYYY-MM-DD

      // 3. Lire-Modifier-Écrire
      const existingConfig = await fetchConfigurationFile(
        globalAccessToken,
        configFolderId,
        NAMING_CONFIG_FILENAME,
      );

      const finalConfigurationData = existingConfig || { rules: [] };

      // Vérifier si une règle avec ce nom existe déjà
      if (
        finalConfigurationData.rules.some(
          (rule) => rule.name === currentRuleState.name,
        )
      ) {
        alert(
          `Une codification nommée "${currentRuleState.name}" existe déjà. Veuillez choisir un nom différent.`,
        );
        // On ne réaffiche pas la page pour que l'utilisateur puisse corriger le nom
        renderCreateNamingRulePage(mainContentDiv, {
          name: ruleName,
          columns: [],
        }); // Réaffiche la page avec les données actuelles
        return;
      }

      const newRule = {
        ...currentRuleState, // Contient déjà le nom et les colonnes
        createdBy: userName,
        createdAt: today,
        modifiedBy: userName,
        modifiedAt: today,
      };

      finalConfigurationData.rules.push(newRule);

      // 4. Sauvegarder le fichier
      await saveConfigurationFile(
        triconnectAPI,
        globalAccessToken,
        finalConfigurationData,
        NAMING_CONFIG_FILENAME,
        configFolderId,
      );

      // 5. Fournir un retour à l'utilisateur
      renderSuccess(
        mainContentDiv,
        `La codification "${currentRuleState.name}" a été enregistrée avec succès.`,
      );

      // Revenir à la page de configuration après un court délai
      setTimeout(handleConfigNamingRuleClick, 2000);
    } catch (error) {
      console.error("Échec de la sauvegarde de la codification :", error);
      renderError(mainContentDiv, error);
    }
  }

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
