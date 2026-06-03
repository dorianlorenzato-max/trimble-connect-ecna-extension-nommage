/**
 * Module pour la communication avec les APIs Trimble Connect.
 */

// Récupère uniquement la liste des groupes d'un projet
async function fetchProjectGroups(projectId, accessToken) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const groupsApiUrl = `https://app21.connect.trimble.com/tc/api/2.0/groups?projectId=${projectId}`;
  const response = await fetch(groupsApiUrl, { headers });
  if (!response.ok)
    throw new Error("Impossible de récupérer les groupes du projet.");
  return await response.json();
}

// lecture du fichier JSON pour la configuration des flux
async function fetchConfigurationFile(accessToken, folderId, filename) {
  const apiBaseUrl = "https://app21.connect.trimble.com/tc/api/2.0";
  try {
    const listItemsUrl = `${apiBaseUrl}/folders/${folderId}/items`;
    const itemsResponse = await fetch(listItemsUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!itemsResponse.ok)
      throw new Error(
        `Impossible de lister le contenu du dossier (Statut: ${itemsResponse.status}).`,
      );

    const allItems = await itemsResponse.json();
    const fileInfo = allItems.find(
      (item) => item.name === filename && item.type === "FILE",
    );

    if (!fileInfo) return null;

    const getDownloadUrl = `${apiBaseUrl}/files/fs/${fileInfo.id}/downloadurl`;
    const downloadInfoResponse = await fetch(getDownloadUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!downloadInfoResponse.ok)
      throw new Error("Impossible d'obtenir l'URL de téléchargement.");

    const downloadInfo = await downloadInfoResponse.json();
    const fileContentResponse = await fetch(downloadInfo.url);
    if (!fileContentResponse.ok)
      throw new Error("Le téléchargement du contenu du fichier a échoué.");

    return await fileContentResponse.json();
  } catch (error) {
    console.error("Erreur dans fetchConfigurationFile:", error);
    throw error;
  }
}

//Sauvegarde un objet de configuration dans un fichier JSON dans le dossier de configuration
async function saveConfigurationFile(
  triconnectAPI,
  accessToken,
  dataToSave,
  filename,
  parentFolderId, // Nom plus clair que "rootFolderId"
) {
  const apiBaseUrl = "https://app21.connect.trimble.com/tc/api/2.0";
  const initiateUploadUrl = `${apiBaseUrl}/files/fs/upload?parentId=${parentFolderId}&parentType=FOLDER`;
  const initiatePayload = { name: filename };

  const initiateResponse = await fetch(initiateUploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(initiatePayload),
  });

  if (!initiateResponse.ok) {
    const errorText = await initiateResponse.text();
    throw new Error(
      `Initiation upload échouée (${initiateResponse.status}): ${errorText}`,
    );
  }

  const uploadDetails = await initiateResponse.json();
  const finalUploadUrl = uploadDetails.contents[0].url;
  const uploadId = uploadDetails.uploadId;

  let fileBlob;
  let contentType;
  if (dataToSave instanceof Blob) {
    fileBlob = dataToSave;
    contentType = dataToSave.type;
  } else {
    const jsonString = JSON.stringify(dataToSave, null, 2);
    fileBlob = new Blob([jsonString], { type: "application/json" });
    contentType = "application/json";
  }

  const uploadResponse = await fetch(finalUploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: fileBlob,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(
      `L'upload final du fichier a échoué. Statut: ${uploadResponse.status}, Réponse: ${errorText}`,
    );
  }

  const verifyUrl = `${apiBaseUrl}/files/fs/upload?uploadId=${uploadId}&wait=true`;
  const verifyResponse = await fetch(verifyUrl, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!verifyResponse.ok) {
    const errorText = await verifyResponse.text();
    throw new Error(
      `La vérification de l'upload a échoué. Statut: ${verifyResponse.status}, Réponse: ${errorText}`,
    );
  }

  const finalFileDetails = await verifyResponse.json();
  if (finalFileDetails.status !== "DONE") {
    throw new Error(
      `Le traitement du fichier sur le serveur a échoué. Statut final: ${finalFileDetails.status || "inconnu"}`,
    );
  }
  return finalFileDetails;
}

// Récupération de l'arborescence du projet Trimble
async function fetchFolderContents(folderId, accessToken) {
  const listItemsUrl = `https://app21.connect.trimble.com/tc/api/2.0/folders/${folderId}/items`;
  const response = await fetch(listItemsUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok)
    throw new Error(
      `Impossible de lister le contenu du dossier ${folderId} (Statut: ${response.status}).`,
    );
  const allItems = await response.json();
  return allItems.filter((item) => item.type === "FOLDER");
}

// Récupère les détails de l'utilisateur actuellement connecté via l'API REST
async function fetchLoggedInUserDetails(accessToken) {
  const userApiUrl = `https://app21.connect.trimble.com/tc/api/2.0/users/me`;
  const response = await fetch(userApiUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok)
    throw new Error(
      `Impossible de récupérer les détails de l'utilisateur connecté.`,
    );
  return await response.json();
}

// Récupération de l'id racine et de des Id des dossiers pour sauvegarder les json
async function getRootFolders(triconnectAPI, accessToken) {
  const basicProjectInfo = await triconnectAPI.project.getCurrentProject();
  const projectId = basicProjectInfo.id;
  const projectDetailsApiUrl = `https://app21.connect.trimble.com/tc/api/2.0/projects/${projectId}`;

  const response = await fetch(projectDetailsApiUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok)
    throw new Error(
      "Impossible de récupérer les détails complets du projet via l'API REST.",
    );

  const fullProjectInfo = await response.json();
  const rootFolderId = fullProjectInfo.rootId;
  if (!rootFolderId)
    throw new Error(
      "Impossible de trouver l'ID du dossier racine dans les détails du projet.",
    );

  return await fetchFolderContents(rootFolderId, accessToken);
}

// Récupère l'ID du dossier "Configuration_Visa" (nous le renommerons en Configuration_Nommage)
async function getConfigFolderId(triconnectAPI, accessToken) {
  const configFolderName = "Configuration_Nommage"; // Nouveau nom de dossier de configuration
  const rootFolders = await getRootFolders(triconnectAPI, accessToken);
  const configFolder = rootFolders.find(
    (folder) => folder.name === configFolderName,
  );

  if (configFolder) {
    return configFolder.id;
  } else {
    console.warn(
      `Avertissement : Le dossier nommé "${configFolderName}" est introuvable à la racine du projet. Il sera créé si une configuration est sauvegardée.`,
    );
    // Dans ce contexte, on ne jette pas d'erreur, car le dossier peut être créé plus tard
    // lors de la sauvegarde de la première configuration.
    return null;
  }
}

//  Nettoie un nom pour qu'il soit valide en tant que nom de dossier
function sanitizeFolderName(name) {
  // Remplace les caractères invalides par des underscores
  return name.replace(/[\\?%*:|"<>]/g, "_");
}

// Crée un dossier dans un dossier parent donné
async function createFolder(parentFolderId, folderName, accessToken) {
  const createUrl = `https://app21.connect.trimble.com/tc/api/2.0/folders`;
  const payload = {
    name: sanitizeFolderName(folderName), // On utilise le nom nettoyé
    parentId: parentFolderId,
  };

  const response = await fetch(createUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `La création du dossier "${folderName}" a échoué: ${errorText}`,
    );
  }

  return await response.json(); // Retourne les détails du nouveau dossier, y compris son ID
}

//  Trouve un dossier ou le crée s'il n'existe pas
async function findOrCreateFolder(parentFolderId, folderName, accessToken) {
  const sanitizedName = sanitizeFolderName(folderName);

  // 1. On cherche d'abord si le dossier existe
  const folderContents = await fetchFolderContents(parentFolderId, accessToken);
  const existingFolder = folderContents.find(
    (item) => item.name === sanitizedName && item.type === "FOLDER",
  );

  if (existingFolder) {
    console.log(
      `Dossier trouvé: "${sanitizedName}" (ID: ${existingFolder.id})`,
    );
    return existingFolder.id; // Il existe, on retourne son ID
  } else {
    // 2. Il n'existe pas, on le crée
    console.log(`Dossier "${sanitizedName}" non trouvé. Création en cours...`);
    const newFolder = await createFolder(
      parentFolderId,
      sanitizedName,
      accessToken,
    );
    console.log(`Dossier créé: "${sanitizedName}" (ID: ${newFolder.id})`);
    return newFolder.id; // On retourne l'ID du dossier nouvellement créé
  }
}

// Récupère l'ID du dossier racine du projet
async function getProjectRootId(triconnectAPI, accessToken) {
  const basicProjectInfo = await triconnectAPI.project.getCurrentProject();
  const projectId = basicProjectInfo.id;
  const projectDetailsApiUrl = `https://app21.connect.trimble.com/tc/api/2.0/projects/${projectId}`;

  const response = await fetch(projectDetailsApiUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(
      "Impossible de récupérer les détails complets du projet via l'API REST.",
    );
  }

  const fullProjectInfo = await response.json();
  const rootId = fullProjectInfo.rootId;
  if (!rootId) {
    throw new Error(
      "Impossible de trouver l'ID du dossier racine (rootId) dans les détails du projet.",
    );
  }

  return rootId;
}

//  Scanne et retourne une liste plate de tous les sous-dossiers.
async function recursivelyFetchAllSubfolders(startFolderId, accessToken) {
  const allSubfolderIds = [];
  const foldersToVisit = [startFolderId]; // On commence avec le dossier parent
  const visitedFolders = new Set(); // Pour éviter les boucles infinies (sécurité)

  while (foldersToVisit.length > 0) {
    const currentFolderId = foldersToVisit.shift(); // On prend le premier de la liste

    if (visitedFolders.has(currentFolderId)) {
      continue; // Déjà visité, on ignore
    }
    visitedFolders.add(currentFolderId);

    try {
      const subFolders = await fetchFolderContents(
        currentFolderId,
        accessToken,
      );
      for (const subFolder of subFolders) {
        allSubfolderIds.push(subFolder.id); // On ajoute l'ID à notre liste de résultats
        foldersToVisit.push(subFolder.id); // On ajoute ce sous-dossier à la liste des prochains à visiter
      }
    } catch (error) {
      console.warn(
        `Impossible de scanner le sous-dossier ${currentFolderId}. Il sera ignoré.`,
        error,
      );
    }
  }
  return allSubfolderIds;
}

// Fonction de récupération des noms de dossier pour tableau configuration
async function fetchAllProjectFolders(triconnectAPI, accessToken) {
  const rootId = await getProjectRootId(triconnectAPI, accessToken);
  const allFolders = []; // On commence avec une liste vide
  await _recursivelyGetAllFolders(rootId, accessToken, allFolders);
  return allFolders;
}

//Fonction récursive
async function _recursivelyGetAllFolders(folderId, accessToken, folderList) {
  try {
    const subFolders = await fetchFolderContents(folderId, accessToken);
    for (const folder of subFolders) {
      folderList.push({ id: folder.id, name: folder.name });
      // Appel récursif pour descendre dans l'arborescence
      await _recursivelyGetAllFolders(folder.id, accessToken, folderList);
    }
  } catch (error) {
    console.warn(
      `Impossible de scanner le contenu du dossier ${folderId}. Il sera ignoré.`,
      error,
    );
  }
}

//  Récupère le rôle de l'utilisateur connecté pour le projet actuel
async function fetchUserProjectRole(projectId, accessToken) {
  const userProjectDetailsUrl = `https://app21.connect.trimble.com/tc/api/2.0/projects/${projectId}/users/me`;

  const response = await fetch(userProjectDetailsUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(
      `Impossible de récupérer le rôle de l'utilisateur pour le projet.`,
    );
  }

  const userProjectDetails = await response.json();
  return userProjectDetails.role;
}

// FONCTION pour mapper tous les utilisateurs à leurs groupes
async function getUsersToGroupsMap(projectId, accessToken) {
  const map = new Map();
  const headers = { Authorization: `Bearer ${accessToken}` };
  const groups = await fetchProjectGroups(projectId, accessToken);

  for (const group of groups) {
    const usersResponse = await fetch(
      `https://app21.connect.trimble.com/tc/api/2.0/groups/${group.id}/users`,
      { headers },
    );
    if (usersResponse.ok) {
      const users = await usersResponse.json();
      users.forEach((user) => {
        if (!map.has(user.id)) {
          map.set(user.id, []);
        }
        map.get(user.id).push(group.id);
      });
    }
  }
  return map;
}

//  FONCTION principale pour récupérer tous les documents à contrôler
async function fetchAllControlledDocuments(
  triconnectAPI,
  accessToken,
  allAssignments,
  isAdmin,
) {
  const projectInfo = await triconnectAPI.project.getCurrentProject();
  const projectId = projectInfo.id;
  const assignedFolderIds = Object.keys(allAssignments);

  if (assignedFolderIds.length === 0) return [];

  let allDocuments = [];
  for (const folderId of assignedFolderIds) {
    const conventionName = allAssignments[folderId];
    try {
      const folderContentResponse = await fetch(
        `https://app21.connect.trimble.com/tc/api/2.0/folders/${folderId}/items?recursive=true&include=details`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      if (folderContentResponse.ok) {
        const items = await folderContentResponse.json();
        items.forEach((item) => {
          if (item.type === "FILE") {
            allDocuments.push({
              ...item,
              conventionName: conventionName,
              depositor: item.modifiedBy
                ? `${item.modifiedBy.firstName} ${item.modifiedBy.lastName}`.trim()
                : "Inconnu",
              depositorId: item.modifiedBy ? item.modifiedBy.id : null,
            });
          }
        });
      }
    } catch (error) {
      console.warn(
        `Impossible de récupérer le contenu du dossier ${folderId}`,
        error,
      );
    }
  }

  // Filtrage par permissions si l'utilisateur n'est pas admin
  if (!isAdmin) {
    const currentUser = await fetchLoggedInUserDetails(accessToken);
    const usersToGroupsMap = await getUsersToGroupsMap(projectId, accessToken);
    const currentUserGroupIds = usersToGroupsMap.get(currentUser.id) || [];

    return allDocuments.filter((doc) => {
      const depositorGroupIds = usersToGroupsMap.get(doc.depositorId) || [];
      // On garde le document si au moins un groupe est en commun
      return depositorGroupIds.some((groupId) =>
        currentUserGroupIds.includes(groupId),
      );
    });
  }

  return allDocuments;
}
//  FONCTION pour récupérer tous les dossiers avec leurs détails (id, name, parentId)
async function fetchAllProjectFoldersWithDetails(triconnectAPI, accessToken) {
  const rootId = await getProjectRootId(triconnectAPI, accessToken);
  const allFolders = [];
  const foldersToScan = [rootId];
  const scannedIds = new Set();

  while (foldersToScan.length > 0) {
    const currentFolderId = foldersToScan.shift();
    if (scannedIds.has(currentFolderId)) continue;
    scannedIds.add(currentFolderId);

    try {
      const folderContents = await fetchFolderContents(
        currentFolderId,
        accessToken,
      );
      for (const folder of folderContents) {
        allFolders.push({
          id: folder.id,
          name: folder.name,
          parentId: currentFolderId,
        });
        foldersToScan.push(folder.id);
      }
    } catch (error) {
      console.warn(
        `Impossible de scanner le dossier ${currentFolderId}.`,
        error,
      );
    }
  }
  return allFolders;
}

// FONCTION pour vérifier la permission d'un dossier
async function checkFolderPermission(folderId, accessToken, userFimId) {
  // On ajoute le paramètre 'fields=inherited' à l'URL
  const url = `https://app21.connect.trimble.com/tc/api/2.0/folders/fs/${folderId}/permissions?fields=inherited`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return null;

    const permissionsData = await response.json();

    // On cible directement l'objet des permissions héritées, qui est le plus pertinent
    const acl = permissionsData.inheritedPermissions?.acl;

    if (!acl) {
      // Si pas de permissions héritées, on vérifie les permissions directes en fallback
      const directAcl = permissionsData.directPermissions?.acl;
      if (!directAcl) return null;

      // On refait la vérification sur les droits directs
      if (
        directAcl.FULL_ACCESS &&
        Array.isArray(directAcl.FULL_ACCESS) &&
        directAcl.FULL_ACCESS.includes(userFimId)
      ) {
        return "full_access";
      }
      if (
        directAcl.READ &&
        Array.isArray(directAcl.READ) &&
        directAcl.READ.includes(userFimId)
      ) {
        return "read";
      }
      return null;
    }

    // Le cas principal : vérifier les droits dans les permissions héritées
    if (
      acl.FULL_ACCESS &&
      Array.isArray(acl.FULL_ACCESS) &&
      (acl.FULL_ACCESS.includes(userFimId) ||
        acl.FULL_ACCESS.includes("tc-groups:*"))
    ) {
      return "full_access";
    }

    if (
      (acl.READ &&
        Array.isArray(acl.READ) &&
        (acl.READ.includes(userFimId) || acl.READ.includes("tc-groups:*"))) ||
      (acl.FULL_ACCESS && Array.isArray(acl.FULL_ACCESS))
    ) // Si FULL_ACCESS existe, on a forcément le droit de lecture
    {
      return "read";
    }

    return null;
  } catch (error) {
    console.error(`Erreur de permission pour le dossier ${folderId}`, error);
    return null;
  }
}
async function uploadFileWithNewName(
  triconnectAPI,
  accessToken,
  parentFolderId,
  fileBlob,
  newFileName,
  fileType,
) {
  const apiBaseUrl = "https://app21.connect.trimble.com/tc/api/2.0";
  const initiateUploadUrl = `${apiBaseUrl}/files/fs/upload?parentId=${parentFolderId}&parentType=FOLDER`;

  // Utilise directement le nouveau nom fourni en argument
  const initiatePayload = { name: newFileName };

  // 1. Initier l'upload
  const initiateResponse = await fetch(initiateUploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(initiatePayload),
  });

  if (!initiateResponse.ok) {
    throw new Error(
      `Initiation de l'upload échouée (${initiateResponse.status})`,
    );
  }

  const uploadDetails = await initiateResponse.json();
  const finalUploadUrl = uploadDetails.contents[0].url;
  const uploadId = uploadDetails.uploadId;

  // 2. Téléverser le contenu du fichier
  const uploadResponse = await fetch(finalUploadUrl, {
    method: "PUT",
    headers: { "Content-Type": fileType }, // Utilise le type fourni
    body: fileBlob, // Utilise le contenu du fichier fourni
  });

  if (!uploadResponse.ok) {
    throw new Error(
      `L'upload final du fichier a échoué (${uploadResponse.status})`,
    );
  }

  // 3. Vérifier l'upload (inchangé)
  const verifyUrl = `${apiBaseUrl}/files/fs/upload?uploadId=${uploadId}&wait=true`;
  const verifyResponse = await fetch(verifyUrl, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!verifyResponse.ok) {
    throw new Error(
      `La vérification de l'upload a échoué (${verifyResponse.status})`,
    );
  }

  const finalFileDetails = await verifyResponse.json();
  if (finalFileDetails.status !== "DONE") {
    throw new Error(`Le traitement du fichier sur le serveur a échoué.`);
  }

  return finalFileDetails;
}

// On exporte les fonctions pour qu'elles soient utilisables dans main.js
export {
  fetchProjectGroups,
  saveConfigurationFile,
  fetchConfigurationFile,
  fetchFolderContents,
  fetchLoggedInUserDetails,
  getRootFolders,
  getConfigFolderId,
  findOrCreateFolder,
  getProjectRootId,
  recursivelyFetchAllSubfolders,
  fetchAllProjectFolders,
  fetchUserProjectRole,
  getUsersToGroupsMap,
  fetchAllControlledDocuments,
  uploadFileWithNewName,
  fetchAllProjectFoldersWithDetails,
  checkFolderPermission,
};
