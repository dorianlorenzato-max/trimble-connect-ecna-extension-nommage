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
  fetchProjectGroups, // Ajoutée pour un usage potentiel futur
} from "./api.js";
import {
  renderLoading,
  renderError,
  renderSaving,
  renderSuccess,
  renderHomePageWithButtons, // Nouvelle fonction
} from "./ui.js";

// Exécution dans une fonction auto-appelée pour ne pas polluer l'espace global
(async function () {
  const mainContentDiv = document.getElementById("mainContent");
  const CONFIG_FOLDER_NAME = "Configuration_Nommage"; // Nouveau nom de dossier de configuration
  const NAMING_CONFIG_FILENAME = "naming-rules-config.json"; // Nom du fichier de configuration des règles de nommage

  let triconnectAPI;
  let globalAccessToken = null;
  let configFolderId = null;
  let currentProjectId = null;
  let isAdmin = false; // Variable pour stocker le statut administrateur

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
      .addEventListener("click", handleConfigNamingClick);

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
      .addEventListener("click", handleConfigNamingClick);
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

  async function handleConfigNamingClick() {
    // Logique pour le bouton "Configuration Nommage"
    console.log("Clic sur Configuration Nommage");
    if (!isAdmin) {
      alert(
        "Accès refusé : Seuls les administrateurs peuvent configurer le nommage.",
      );
      renderHomePageWithButtons(mainContentDiv, isAdmin); // Revenir à la page d'accueil
      return;
    }
    renderLoading(mainContentDiv); // Affiche un message de chargement
    // Ici, vous appelerez la fonction de rendu spécifique pour la configuration
    mainContentDiv.innerHTML =
      "<h2>Configuration du Nommage (à développer)</h2><p>Interface de configuration...</p>";
  }
})();
