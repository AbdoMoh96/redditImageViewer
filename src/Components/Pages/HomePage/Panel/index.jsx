import React, { useEffect, useRef, useState } from "react";
import { Section, OpenBtn, CloseBtn, Button } from "./StyledComponents/style";
import "./Scss/style.scss";
import axios from "axios";
import "../../../../Resources/Public/Scss/bulma/bulma.sass";
import imagesGetter from "../../../../Helpers/imagesGetter";
import swal from "sweetalert";

const Panel = ({ imagesUpdate, loader, activeSlide, slideToUpdate }) => {
  const [classes, updateClasses] = useState("panelHide");
  const [text, textUpdate] = useState("");
  const [imageUrls, setImageUrls] = useState([]);
  const [status, statusUpdate] = useState({
    next: "",
    previous: "",
  });
  const [count, countUpdate] = useState(0);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [collectionsOpen, setCollectionsOpen] = useState(true);
  const [collections, setCollections] = useState([]);
  const [activeCollection, setActiveCollection] = useState(null);
  const [collectionForm, setCollectionForm] = useState({
    name: "",
    image: "",
    query: "",
  });
  const saveTimeoutRef = useRef(null);
  const tokenClientRef = useRef(null);
  const accessTokenRef = useRef(null);
  const tokenExpiryRef = useRef(0);
  const collectionsLoadedRef = useRef(false);

  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const GOOGLE_OAUTH_SCOPES =
    import.meta.env.VITE_GOOGLE_OAUTH_SCOPES ||
    "https://www.googleapis.com/auth/drive.file";
  const GOOGLE_API_BASE =
    import.meta.env.VITE_GOOGLE_API_BASE || "https://www.googleapis.com";
  const GOOGLE_GSI_SCRIPT =
    import.meta.env.VITE_GOOGLE_GSI_SCRIPT ||
    "https://accounts.google.com/gsi/client";
  const DRIVE_FOLDER_NAME =
    import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_NAME || "reddit-image";
  const DRIVE_FILE_NAME =
    import.meta.env.VITE_GOOGLE_DRIVE_FILE_NAME || "state.json";
  const COLLECTIONS_FILE_NAME =
    import.meta.env.VITE_GOOGLE_DRIVE_COLLECTIONS_FILE_NAME ||
    "collections.json";

  const buildStatePayload = () => ({
    searchText: text,
    currentStatus: status,
    currentCount: count,
    currentActiveSlide: activeSlide,
    currentImageUrls: imageUrls,
  });

  const saveTolocalStorage = async () => {
    localStorage.setItem(
      "state",
      JSON.stringify(buildStatePayload())
    );
    setShowSavedModal(true);
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      setShowSavedModal(false);
      saveTimeoutRef.current = null;
    }, 3000);

    await syncStateToDrive();
  };

  const applySavedState = (data) => {
    if (!data) {
      return;
    }
    textUpdate(data.searchText || "");
    statusUpdate(data.currentStatus || { next: "", previous: "" });
    setImageUrls(data.currentImageUrls || []);
    imagesUpdate(data.currentImageUrls || []);
    slideToUpdate(data.currentActiveSlide || 0);
    countUpdate(data.currentCount || 0);
  };

  const restoreFromDrive = async () => {
    try {
      const { token, collections: availableCollections } =
        await ensureDriveReady();
      const folderId = await getDriveFolderId(token);
      if (!folderId) {
        await swal({
          title: "No saved state found in Google Drive",
        });
        return;
      }
      const targetCollection = activeCollection || availableCollections[0];
      if (!targetCollection) {
        await swal({
          title: "Select a collection first",
        });
        return;
      }
      const collectionFolderId = await getOrCreateCollectionFolder(
        token,
        folderId,
        targetCollection.name
      );
      const fileId = await getDriveFileId(
        token,
        collectionFolderId,
        DRIVE_FILE_NAME
      );
      if (!fileId) {
        await swal({
          title: "No saved state found in Google Drive",
        });
        return;
      }
      const data = await downloadDriveFile(token, fileId);
      applySavedState(data);
      localStorage.setItem("state", JSON.stringify(data));
    } catch (error) {
      await swal({
        title: "Google Drive restore failed",
        text: getDriveErrorMessage(error),
      });
    }
  };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (!GOOGLE_CLIENT_ID) {
      return () => {};
    }
    loadGoogleScript(GOOGLE_GSI_SCRIPT)
      .then(() => {
        if (!isMounted) {
          return;
        }
        if (!window.google?.accounts?.oauth2) {
          throw new Error("Google Identity Services failed to load.");
        }
        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: GOOGLE_OAUTH_SCOPES,
          callback: () => {},
        });
        swal({
          title: "Connect Google Drive?",
          text: "Sign in to load your collections and saved states.",
          buttons: ["Not now", "Connect"],
        }).then((willConnect) => {
          if (willConnect) {
            ensureDriveReady({ promptMode: "none" }).catch(async () => {
              await swal({
                title: "Google sign-in required",
                text: "Please sign in to Google in this browser, then try Connect again.",
              });
            });
          }
        });
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [GOOGLE_CLIENT_ID, GOOGLE_GSI_SCRIPT, GOOGLE_OAUTH_SCOPES]);

  const viewPanel = () => {
    if (classes === "panelHide") {
      updateClasses("panelShow");
    } else {
      updateClasses("panelHide");
    }
  };

  const getImages = async () => {
    try {
      loader(true);
      const url = `https://www.reddit.com/r/${text}/new.json?limit=100`;
      let res = await axios.get(url);
      let urls = imagesGetter(res.data.data.children);
      imagesUpdate((state) => urls);
      setImageUrls((state) => urls);
      slideToUpdate(0);
      statusUpdate({ ...status, next: urls[urls.length - 1].id });
      loader(false);
    } catch {
      await swal({
        title: "subreddit not found or subreddit has no images",
      });
      loader(false);
    }
  };

  const getNextImages = async () => {
    try {
      countUpdate((state) => state + 1);
      loader(true);
      const url = `https://www.reddit.com/r/${text}/new.json?limit=100&after=${status.next}`;
      let res = await axios.get(url);
      let urls = imagesGetter(res.data.data.children);
      imagesUpdate((state) => urls);
      setImageUrls((state) => urls);
      slideToUpdate(0);
      statusUpdate({
        ...status,
        next: urls[urls.length - 1].id,
        previous: urls[0].id,
      });
      loader(false);
    } catch {
      await swal({
        title: "subreddit not found or subreddit has no images",
      });
      loader(false);
    }
  };

  const getPreImages = async () => {
    try {
      countUpdate((state) => state - 1);
      loader(true);
      let imageId = status.previous;
      const url = `https://www.reddit.com/r/${text}/new.json?limit=100&before=${imageId}`;
      let res = await axios.get(url);
      let urls = imagesGetter(res.data.data.children);
      imagesUpdate((state) => urls);
      setImageUrls((state) => urls);
      slideToUpdate(0);
      statusUpdate({
        ...status,
        next: urls[urls.length - 1].id,
        previous: urls[0].id,
      });
      loader(false);
    } catch {
      await swal({
        title: "subreddit not found or subreddit has no images",
      });
      loader(false);
    }
  };

  const loadGoogleScript = (src) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Google script"));
      document.head.appendChild(script);
    });
  };

  const ensureAccessToken = async ({ promptMode = "none" } = {}) => {
    if (!GOOGLE_CLIENT_ID) {
      throw new Error("Missing Google client ID.");
    }
    if (!accessTokenRef.current) {
      const cachedToken = localStorage.getItem("googleDriveToken");
      const cachedExpiry = Number(
        localStorage.getItem("googleDriveTokenExpiry") || 0
      );
      if (cachedToken && cachedExpiry && Date.now() < cachedExpiry) {
        accessTokenRef.current = cachedToken;
        tokenExpiryRef.current = cachedExpiry;
      }
    }
    if (accessTokenRef.current && Date.now() < tokenExpiryRef.current) {
      return accessTokenRef.current;
    }
    if (!tokenClientRef.current) {
      await loadGoogleScript(GOOGLE_GSI_SCRIPT);
      if (!window.google?.accounts?.oauth2) {
        throw new Error("Google Identity Services unavailable.");
      }
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: GOOGLE_OAUTH_SCOPES,
        callback: () => {},
      });
    }
    return new Promise((resolve, reject) => {
      tokenClientRef.current.callback = (response) => {
        if (response?.error) {
          reject(response);
          return;
        }
        accessTokenRef.current = response.access_token;
        tokenExpiryRef.current =
          Date.now() + (response.expires_in || 3600) * 1000 - 60 * 1000;
        localStorage.setItem("googleDriveToken", accessTokenRef.current);
        localStorage.setItem(
          "googleDriveTokenExpiry",
          String(tokenExpiryRef.current)
        );
        resolve(accessTokenRef.current);
      };
      tokenClientRef.current.requestAccessToken({
        prompt: promptMode,
      });
    });
  };

  const driveRequest = async (token, path, options = {}) => {
    const res = await fetch(`${GOOGLE_API_BASE}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || `Drive request failed: ${res.status}`);
    }
    return res;
  };

  const listDriveFiles = async (token, query) => {
    const params = new URLSearchParams({
      q: query,
      fields: "files(id,name)",
    });
    const res = await driveRequest(
      token,
      `/drive/v3/files?${params.toString()}`
    );
    const data = await res.json();
    return data.files || [];
  };

  const getDriveFolderId = async (token) => {
    const folders = await listDriveFiles(
      token,
      `name='${DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false`
    );
    return folders[0]?.id || null;
  };

  const escapeDriveQuery = (value) => value.replace(/'/g, "\\'");

  const getOrCreateDriveFolder = async (token) => {
    const existingId = await getDriveFolderId(token);
    if (existingId) {
      return existingId;
    }
    const res = await driveRequest(token, "/drive/v3/files?fields=id", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: DRIVE_FOLDER_NAME,
        mimeType: "application/vnd.google-apps.folder",
        parents: ["root"],
      }),
    });
    const data = await res.json();
    return data.id;
  };

  const getDriveFileId = async (token, folderId, fileName = DRIVE_FILE_NAME) => {
    const files = await listDriveFiles(
      token,
      `name='${escapeDriveQuery(fileName)}' and '${folderId}' in parents and trashed=false`
    );
    return files[0]?.id || null;
  };

  const getOrCreateCollectionFolder = async (
    token,
    parentFolderId,
    collectionName
  ) => {
    const folders = await listDriveFiles(
      token,
      `name='${escapeDriveQuery(collectionName)}' and mimeType='application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed=false`
    );
    if (folders[0]?.id) {
      return folders[0].id;
    }
    const res = await driveRequest(token, "/drive/v3/files?fields=id", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: collectionName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentFolderId],
      }),
    });
    const data = await res.json();
    return data.id;
  };

  const buildMultipartBody = (metadata, content) => {
    const boundary = `----gdrive-${crypto.randomUUID?.() || Date.now()}`;
    const delimiter = `--${boundary}`;
    const close = `--${boundary}--`;
    const body = [
      delimiter,
      "Content-Type: application/json; charset=UTF-8",
      "",
      JSON.stringify(metadata),
      delimiter,
      "Content-Type: application/json; charset=UTF-8",
      "",
      content,
      close,
      "",
    ].join("\r\n");
    return { body, boundary };
  };

  const createDriveFile = async (
    token,
    folderId,
    content,
    fileName = DRIVE_FILE_NAME
  ) => {
    const metadata = {
      name: fileName,
      parents: [folderId],
    };
    const { body, boundary } = buildMultipartBody(metadata, content);
    await driveRequest(
      token,
      "/upload/drive/v3/files?uploadType=multipart",
      {
        method: "POST",
        headers: {
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    );
  };

  const updateDriveFile = async (token, fileId, content) => {
    await driveRequest(
      token,
      `/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: content,
      }
    );
  };

  const downloadDriveFile = async (token, fileId) => {
    const res = await driveRequest(
      token,
      `/drive/v3/files/${fileId}?alt=media`
    );
    return res.json();
  };

  const loadCollectionsFromDrive = async (token) => {
    const folderId = await getDriveFolderId(token);
    if (!folderId) {
      setCollections([]);
      return [];
    }
    const collectionsFileId = await getDriveFileId(
      token,
      folderId,
      COLLECTIONS_FILE_NAME
    );
    if (!collectionsFileId) {
      setCollections([]);
      return [];
    }
    const data = await downloadDriveFile(token, collectionsFileId);
    const list = Array.isArray(data) ? data : data?.collections || [];
    setCollections(list);
    return list;
  };

  const syncCollectionsToDrive = async (token, folderId, list) => {
    const collectionsFileId = await getDriveFileId(
      token,
      folderId,
      COLLECTIONS_FILE_NAME
    );
    const payload = JSON.stringify(list);
    if (collectionsFileId) {
      await updateDriveFile(token, collectionsFileId, payload);
    } else {
      await createDriveFile(token, folderId, payload, COLLECTIONS_FILE_NAME);
    }
  };

  const ensureDriveReady = async ({ promptMode = "none" } = {}) => {
    const token = await ensureAccessToken({ promptMode });
    let loadedCollections = collections;
    if (!collectionsLoadedRef.current) {
      loadedCollections = await loadCollectionsFromDrive(token);
      collectionsLoadedRef.current = true;
    }
    return { token, collections: loadedCollections };
  };

  const syncStateToDrive = async () => {
    try {
      const { token, collections: availableCollections } =
        await ensureDriveReady();
      const folderId = await getOrCreateDriveFolder(token);
      const targetCollection = activeCollection || availableCollections[0];
      if (!targetCollection) {
        await swal({
          title: "Select a collection first",
        });
        return;
      }
      const collectionFolderId = await getOrCreateCollectionFolder(
        token,
        folderId,
        targetCollection.name
      );
      const fileId = await getDriveFileId(
        token,
        collectionFolderId,
        DRIVE_FILE_NAME
      );
      const payload = JSON.stringify(buildStatePayload());
      if (fileId) {
        await updateDriveFile(token, fileId, payload);
      } else {
        await createDriveFile(
          token,
          collectionFolderId,
          payload,
          DRIVE_FILE_NAME
        );
      }
    } catch (error) {
      await swal({
        title: "Google Drive sync failed",
        text: getDriveErrorMessage(error),
      });
    }
  };

  const getDriveErrorMessage = (error) => {
    if (typeof error === "string") {
      return error;
    }
    if (error?.error_description) {
      return error.error_description;
    }
    if (error?.message) {
      return error.message;
    }
    return "Please try again.";
  };

  const openCollectionModal = () => {
    setShowCollectionModal(true);
  };

  const closeCollectionModal = () => {
    setShowCollectionModal(false);
    setCollectionForm({ name: "", image: "", query: "" });
  };

  const handleCreateCollection = async () => {
    const trimmedName = collectionForm.name.trim();
    const trimmedImage = collectionForm.image.trim();
    const trimmedQuery = collectionForm.query.trim();
    if (!trimmedName || !trimmedQuery) {
      await swal({
        title: "Please add a name and collection string",
      });
      return;
    }
    let baseCollections = collections;
    let token = null;
    try {
      token = await ensureAccessToken();
      if (!collectionsLoadedRef.current) {
        baseCollections = await loadCollectionsFromDrive(token);
        collectionsLoadedRef.current = true;
      }
    } catch (error) {
      token = null;
    }
    const duplicate = baseCollections.some(
      (item) => item.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicate) {
      await swal({
        title: "Collection name already exists",
      });
      return;
    }
    const newCollection = {
      name: trimmedName,
      image: trimmedImage,
      query: trimmedQuery,
    };
    const nextCollections = [...baseCollections, newCollection];
    setCollections(nextCollections);
    setActiveCollection(newCollection);
    textUpdate(newCollection.query);
    closeCollectionModal();
    if (token) {
      try {
        const folderId = await getOrCreateDriveFolder(token);
        await getOrCreateCollectionFolder(token, folderId, newCollection.name);
        await syncCollectionsToDrive(token, folderId, nextCollections);
      } catch (error) {
        await swal({
          title: "Google Drive sync failed",
          text: getDriveErrorMessage(error),
        });
      }
    }
  };

  const handleSelectCollection = (collection) => {
    setActiveCollection(collection);
    textUpdate(collection.query || "");
  };

  return (
    <Section className={classes}>
      <div
        className={`collections_sidebar ${
          collectionsOpen ? "collections_sidebar--open" : ""
        }`}
      >
        <button
          className="collections_sidebar__toggle"
          onClick={() => setCollectionsOpen((state) => !state)}
          type="button"
        >
          {collectionsOpen ? "<" : ">"}
        </button>
        <div className="collections_sidebar__header">
          <div className="collections_sidebar__title">Collections</div>
          <button
            className="collections_sidebar__add"
            onClick={openCollectionModal}
            type="button"
          >
            + Add
          </button>
        </div>
        <div className="collections_sidebar__list">
          {collections.map((collection) => (
            <button
              key={collection.name}
              className={`collections_sidebar__item ${
                activeCollection?.name === collection.name
                  ? "collections_sidebar__item--active"
                  : ""
              }`}
              onClick={() => handleSelectCollection(collection)}
              type="button"
            >
              <img
                src={collection.image || "https://placehold.co/64x64"}
                alt={collection.name}
              />
              <span>{collection.name}</span>
            </button>
          ))}
        </div>
      </div>
      <Button
        className={"previous_btn_panel"}
        disabled={count <= 0}
        onClick={() => getPreImages()}
      >
        previous stack
      </Button>

      <div className="field">
        <p className="control has-icons-left">
          <input
            className="input"
            type="text"
            placeholder="add subreddit's name"
            onChange={(e) => textUpdate((state) => e.target.value)}
            value={text}
            onKeyPress={(e) => e.key === "Enter" && getImages()}
          />
        </p>
        <p className="control has-icons-left">
          <Button
            className={"next_btn_panel"}
            onClick={() => saveTolocalStorage()}
          >
            save
          </Button>
          <Button
            className={"next_btn_panel"}
            onClick={() => restoreFromDrive()}
          >
            restore
          </Button>
        </p>
      </div>

      <Button className={"next_btn_panel"} onClick={() => getNextImages()}>
        next stack
      </Button>

      <OpenBtn onClick={() => viewPanel()}>
        <span />
        <span />
        <span />
      </OpenBtn>

      <CloseBtn onClick={() => viewPanel()}>
        <h3>&#10005;</h3>
      </CloseBtn>

      {showSavedModal && (
        <div className="saved_modal" role="status" aria-live="polite">
          <div className="saved_modal__backdrop" />
          <div className="saved_modal__content">Saved successfully</div>
        </div>
      )}

      {showCollectionModal && (
        <div className="collection_modal" role="dialog" aria-modal="true">
          <div
            className="collection_modal__backdrop"
            onClick={closeCollectionModal}
            role="presentation"
          />
          <div className="collection_modal__content">
            <h3>Create Collection</h3>
            <input
              className="input"
              type="text"
              placeholder="Collection name"
              value={collectionForm.name}
              onChange={(event) =>
                setCollectionForm((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
            />
            <input
              className="input"
              type="text"
              placeholder="Image URL"
              value={collectionForm.image}
              onChange={(event) =>
                setCollectionForm((prev) => ({
                  ...prev,
                  image: event.target.value,
                }))
              }
            />
            <input
              className="input"
              type="text"
              placeholder="Collection string (cats+dogs+birds)"
              value={collectionForm.query}
              onChange={(event) =>
                setCollectionForm((prev) => ({
                  ...prev,
                  query: event.target.value,
                }))
              }
            />
            <div className="collection_modal__actions">
              <Button type="button" onClick={handleCreateCollection}>
                Create
              </Button>
              <Button type="button" onClick={closeCollectionModal}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </Section>
  );
};

export default Panel;
