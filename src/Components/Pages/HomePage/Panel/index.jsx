"use client";

import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import swal from "sweetalert";
import imagesGetter from "../../../../Helpers/imagesGetter";

const Panel = ({ imagesUpdate, loader, activeSlide, slideToUpdate }) => {
  const [panelOpen, setPanelOpen] = useState(false);
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
  const [collectionMenuOpen, setCollectionMenuOpen] = useState(null);
  const [editingCollection, setEditingCollection] = useState(null);
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

  const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const GOOGLE_OAUTH_SCOPES =
    process.env.NEXT_PUBLIC_GOOGLE_OAUTH_SCOPES ||
    "https://www.googleapis.com/auth/drive.file";
  const GOOGLE_API_BASE =
    process.env.NEXT_PUBLIC_GOOGLE_API_BASE || "https://www.googleapis.com";
  const GOOGLE_GSI_SCRIPT =
    process.env.NEXT_PUBLIC_GOOGLE_GSI_SCRIPT ||
    "https://accounts.google.com/gsi/client";
  const DRIVE_FOLDER_NAME =
    process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_NAME || "reddit-image";
  const DRIVE_FILE_NAME =
    process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FILE_NAME || "state.json";
  const COLLECTIONS_FILE_NAME =
    process.env.NEXT_PUBLIC_GOOGLE_DRIVE_COLLECTIONS_FILE_NAME ||
    "collections.json";

  const buildRedditUrl = ({ subreddit, limit = 100, after, before }) => {
    const url = new URL(
      `/r/${encodeURIComponent(subreddit)}/new.json`,
      "https://old.reddit.com"
    );
    url.searchParams.set("limit", String(limit));
    if (after) {
      url.searchParams.set("after", after);
    }
    if (before) {
      url.searchParams.set("before", before);
    }
    return url.toString();
  };

  const fetchRedditImages = async ({ subreddit, limit, after, before }) => {
    const url = buildRedditUrl({ subreddit, limit, after, before });
    const res = await axios.get(url);
    const data = res.data?.data;
    return {
      images: imagesGetter(data?.children || []),
      after: data?.after || "",
      before: data?.before || "",
    };
  };

  const buildStatePayload = () => ({
    searchText: text,
    currentStatus: status,
    currentCount: count,
    currentActiveSlide: activeSlide,
    currentImageUrls: imageUrls,
  });

  const saveTolocalStorage = async () => {
    localStorage.setItem("state", JSON.stringify(buildStatePayload()));
    setShowSavedModal(true);
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      setShowSavedModal(false);
      saveTimeoutRef.current = null;
    }, 1000);

    await syncStateToDrive({ promptMode: "consent" });
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
        await ensureDriveReady({ promptMode: "consent" });
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
    if (typeof window === "undefined") {
      return () => {};
    }
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const handleChange = (event) => {
      setPanelOpen(event.matches);
    };
    setPanelOpen(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
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
            ensureDriveReady({ promptMode: "consent" }).catch(async () => {
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

  const togglePanel = () => {
    setPanelOpen((state) => !state);
  };

  const getImages = async (queryOverride) => {
    try {
      const query = (queryOverride ?? text).trim();
      if (!query) {
        await swal({
          title: "Please enter a collection string",
        });
        return;
      }
      loader(true);
      const { images, after, before } = await fetchRedditImages({
        subreddit: query,
        limit: 100,
      });
      const urls = images || [];
      if (!urls.length) {
        throw new Error("No images found");
      }
      imagesUpdate(() => urls);
      setImageUrls(() => urls);
      slideToUpdate(0);
      statusUpdate({
        ...status,
        next: after,
        previous: before,
      });
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
      const { images, after, before } = await fetchRedditImages({
        subreddit: text,
        limit: 100,
        after: status.next,
      });
      const urls = images || [];
      if (!urls.length) {
        throw new Error("No images found");
      }
      imagesUpdate(() => urls);
      setImageUrls(() => urls);
      slideToUpdate(0);
      statusUpdate({
        ...status,
        next: after,
        previous: before,
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
      const { images, after, before } = await fetchRedditImages({
        subreddit: text,
        limit: 100,
        before: status.previous,
      });
      const urls = images || [];
      if (!urls.length) {
        throw new Error("No images found");
      }
      imagesUpdate(() => urls);
      setImageUrls(() => urls);
      slideToUpdate(0);
      statusUpdate({
        ...status,
        next: after,
        previous: before,
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

  const getCollectionFolderId = async (
    token,
    parentFolderId,
    collectionName
  ) => {
    const folders = await listDriveFiles(
      token,
      `name='${escapeDriveQuery(collectionName)}' and mimeType='application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed=false`
    );
    return folders[0]?.id || null;
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

  const deleteDriveFile = async (token, fileId) => {
    await driveRequest(token, `/drive/v3/files/${fileId}`, {
      method: "DELETE",
    });
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

  const syncStateToDrive = async ({ promptMode = "none" } = {}) => {
    try {
      const { token, collections: availableCollections } =
        await ensureDriveReady({ promptMode });
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
    setEditingCollection(null);
    setShowCollectionModal(true);
  };

  const closeCollectionModal = () => {
    setShowCollectionModal(false);
    setEditingCollection(null);
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
      token = await ensureAccessToken({ promptMode: "consent" });
      if (!collectionsLoadedRef.current) {
        baseCollections = await loadCollectionsFromDrive(token);
        collectionsLoadedRef.current = true;
      }
    } catch (error) {
      token = null;
    }
    const duplicate = baseCollections.some((item) => {
      if (
        editingCollection &&
        item.name.trim().toLowerCase() ===
          editingCollection.name.trim().toLowerCase()
      ) {
        return false;
      }
      return item.name.trim().toLowerCase() === trimmedName.toLowerCase();
    });
    if (duplicate) {
      await swal({
        title: "Collection name already exists",
      });
      return;
    }
    let nextCollections = [];
    let nextActive = activeCollection;
    if (editingCollection) {
      const updatedCollection = {
        ...editingCollection,
        name: trimmedName,
        image: trimmedImage,
        query: trimmedQuery,
      };
      nextCollections = baseCollections.map((item) =>
        item.name === editingCollection.name ? updatedCollection : item
      );
      setCollections(nextCollections);
      if (activeCollection?.name === editingCollection.name) {
        setActiveCollection(updatedCollection);
        textUpdate(updatedCollection.query);
        nextActive = updatedCollection;
      }
      closeCollectionModal();
    } else {
      const newCollection = {
        name: trimmedName,
        image: trimmedImage,
        query: trimmedQuery,
      };
      nextCollections = [...baseCollections, newCollection];
      setCollections(nextCollections);
      setActiveCollection(newCollection);
      textUpdate(newCollection.query);
      closeCollectionModal();
      nextActive = newCollection;
    }
    if (token) {
      try {
        const folderId = await getOrCreateDriveFolder(token);
        if (editingCollection && editingCollection.name !== trimmedName) {
          await getOrCreateCollectionFolder(token, folderId, trimmedName);
        }
        if (!editingCollection) {
          await getOrCreateCollectionFolder(token, folderId, nextActive.name);
        }
        await syncCollectionsToDrive(token, folderId, nextCollections);
      } catch (error) {
        await swal({
          title: "Google Drive sync failed",
          text: getDriveErrorMessage(error),
        });
      }
    }
  };

  const handleEditCollection = (collection) => {
    setEditingCollection(collection);
    setCollectionForm({
      name: collection.name || "",
      image: collection.image || "",
      query: collection.query || "",
    });
    setShowCollectionModal(true);
  };

  const handleDeleteCollection = async (collection) => {
    const confirmDelete = await swal({
      title: "Delete collection?",
      text: `Are you sure you want to delete "${collection.name}"?`,
      buttons: ["Cancel", "Delete"],
      dangerMode: true,
    });
    if (!confirmDelete) {
      return;
    }
    const nextCollections = collections.filter(
      (item) => item.name !== collection.name
    );
    setCollections(nextCollections);
    if (activeCollection?.name === collection.name) {
      setActiveCollection(null);
    }
    setCollectionMenuOpen(null);
    try {
      const { token } = await ensureDriveReady({ promptMode: "none" });
      const folderId = await getOrCreateDriveFolder(token);
      await syncCollectionsToDrive(token, folderId, nextCollections);
      const collectionFolderId = await getCollectionFolderId(
        token,
        folderId,
        collection.name
      );
      if (collectionFolderId) {
        await deleteDriveFile(token, collectionFolderId);
      }
    } catch (error) {
      await swal({
        title: "Google Drive sync failed",
        text: getDriveErrorMessage(error),
      });
    }
  };

  const handleClearCollectionState = async (collection) => {
    const confirmClear = await swal({
      title: "Clear Google state?",
      text: `Remove the saved state for "${collection.name}" from Google Drive?`,
      buttons: ["Cancel", "Clear"],
      dangerMode: true,
    });
    if (!confirmClear) {
      return;
    }
    try {
      const { token } = await ensureDriveReady({ promptMode: "none" });
      const folderId = await getDriveFolderId(token);
      if (!folderId) {
        await swal({ title: "No Google Drive state found" });
        return;
      }
      const collectionFolderId = await getCollectionFolderId(
        token,
        folderId,
        collection.name
      );
      if (!collectionFolderId) {
        await swal({ title: "No Google Drive state found" });
        return;
      }
      const fileId = await getDriveFileId(
        token,
        collectionFolderId,
        DRIVE_FILE_NAME
      );
      if (!fileId) {
        await swal({ title: "No Google Drive state found" });
        return;
      }
      await deleteDriveFile(token, fileId);
      await swal({ title: "Google Drive state cleared" });
    } catch (error) {
      await swal({
        title: "Google Drive sync failed",
        text: getDriveErrorMessage(error),
      });
    }
  };

  const handleSelectCollection = async (collection) => {
    const query = collection.query || "";
    if (activeCollection && activeCollection.name !== collection.name) {
      await syncStateToDrive();
    }
    setActiveCollection(collection);
    textUpdate(query);
    setCollectionMenuOpen(null);
    try {
      const { token } = await ensureDriveReady({ promptMode: "none" });
      const folderId = await getDriveFolderId(token);
      if (!folderId) {
        await getImages(query);
        return;
      }
      const collectionFolderId = await getOrCreateCollectionFolder(
        token,
        folderId,
        collection.name
      );
      const fileId = await getDriveFileId(
        token,
        collectionFolderId,
        DRIVE_FILE_NAME
      );
      if (!fileId) {
        await getImages(query);
        return;
      }
      const data = await downloadDriveFile(token, fileId);
      applySavedState(data);
      localStorage.setItem("state", JSON.stringify(data));
    } catch (error) {
      await getImages(query);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={togglePanel}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-950/80 px-4 py-2 text-xs uppercase tracking-[0.35em] text-emerald-300 shadow-[0_12px_40px_rgba(0,0,0,0.55)] transition hover:border-emerald-400/60"
      >
        {panelOpen ? "Close" : "Open"} panel
      </button>

      <section
        className={`fixed inset-x-0 bottom-0 z-30 flex max-h-[85svh] flex-col overflow-hidden border-t border-slate-800/70 bg-slate-950/90 backdrop-blur transition-transform duration-300 lg:inset-y-0 lg:right-0 lg:left-auto lg:h-full lg:w-[420px] lg:border-l lg:border-t-0 ${
          panelOpen
            ? "translate-y-0 lg:translate-x-0"
            : "translate-y-full lg:translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-800/70 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-emerald-300/70">
              Control deck
            </p>
            <h2 className="text-lg font-semibold">Stack commands</h2>
          </div>
          <button
            type="button"
            onClick={togglePanel}
            className="rounded-full border border-slate-700/70 px-3 py-1 text-xs uppercase tracking-[0.25em] text-slate-300"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800/70 bg-slate-900/60 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    Active stack
                  </p>
                  <p className="text-base font-semibold text-slate-100">
                    {activeCollection?.name || "Unassigned"}
                  </p>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <p>Stack #{count + 1}</p>
                  <p>Slide {activeSlide + 1}</p>
                </div>
              </div>
              <div className="mt-4">
                <label className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  Subreddit
                </label>
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-700/80 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/70 focus:outline-none"
                  type="text"
                  placeholder="cats+dogs+birds"
                  value={text}
                  onChange={(event) => textUpdate(event.target.value)}
                />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => getImages()}
                  className="rounded-full border border-emerald-400/60 bg-emerald-400/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-emerald-200 transition hover:bg-emerald-400/20"
                >
                  Load
                </button>
                <button
                  type="button"
                  onClick={restoreFromDrive}
                  className="rounded-full border border-slate-700/70 px-4 py-2 text-xs uppercase tracking-[0.3em] text-slate-200 transition hover:border-slate-500"
                >
                  Restore
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800/70 bg-slate-900/60 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-100">
                  Stack navigation
                </p>
                <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  {status.next ? "Ready" : "Idle"}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  className="rounded-full border border-slate-700/70 px-4 py-2 text-xs uppercase tracking-[0.3em] text-slate-200 transition hover:border-slate-500 disabled:opacity-40"
                  disabled={count <= 0}
                  onClick={() => getPreImages()}
                  type="button"
                >
                  Previous
                </button>
                <button
                  className="rounded-full border border-slate-700/70 px-4 py-2 text-xs uppercase tracking-[0.3em] text-slate-200 transition hover:border-slate-500"
                  onClick={() => getNextImages()}
                  type="button"
                >
                  Next
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  className="rounded-full border border-emerald-400/60 bg-emerald-400/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-emerald-200 transition hover:bg-emerald-400/20"
                  onClick={() => saveTolocalStorage()}
                  type="button"
                >
                  Save
                </button>
                <button
                  className="rounded-full border border-slate-700/70 px-4 py-2 text-xs uppercase tracking-[0.3em] text-slate-200 transition hover:border-slate-500"
                  type="button"
                  onClick={() => syncStateToDrive({ promptMode: "consent" })}
                >
                  Sync
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800/70 bg-slate-900/60 p-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCollectionsOpen((state) => !state)}
                  className="text-sm font-semibold text-slate-100"
                >
                  Collections
                </button>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-full border border-slate-700/70 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-slate-200"
                    onClick={openCollectionModal}
                    type="button"
                  >
                    Add
                  </button>
                  <button
                    className="rounded-full border border-emerald-400/60 bg-emerald-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-emerald-200"
                    onClick={() => saveTolocalStorage()}
                    type="button"
                  >
                    Save
                  </button>
                </div>
              </div>
              {collectionsOpen && (
                <div className="mt-4 space-y-3">
                  {collections.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-700/70 p-4 text-center text-xs text-slate-400">
                      No collections yet. Add one to get started.
                    </div>
                  ) : (
                    collections.map((collection) => (
                      <div
                        key={collection.name}
                        className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-2 transition ${
                          activeCollection?.name === collection.name
                            ? "border-emerald-400/60 bg-emerald-400/10"
                            : "border-slate-800/70 bg-slate-950/40"
                        }`}
                      >
                        <button
                          className="flex flex-1 items-center gap-3 text-left"
                          onClick={() => handleSelectCollection(collection)}
                          type="button"
                        >
                          <img
                            src={collection.image || "https://placehold.co/80x80"}
                            alt={collection.name}
                            className="h-12 w-12 rounded-xl object-cover"
                          />
                          <div>
                            <p className="text-sm font-semibold text-slate-100">
                              {collection.name}
                            </p>
                          </div>
                        </button>
                        <div className="relative">
                          <button
                            className="rounded-full border border-slate-700/70 px-2 py-1 text-xs text-slate-200"
                            type="button"
                            onClick={() =>
                              setCollectionMenuOpen((state) =>
                                state === collection.name ? null : collection.name
                              )
                            }
                          >
                            More
                          </button>
                          {collectionMenuOpen === collection.name && (
                            <div className="absolute right-0 top-full z-10 mt-2 w-36 rounded-2xl border border-slate-800/80 bg-slate-950/95 p-2 text-xs">
                              <button
                                type="button"
                                className="w-full rounded-xl px-3 py-2 text-left text-slate-200 transition hover:bg-slate-800/60"
                                onClick={() => {
                                  setCollectionMenuOpen(null);
                                  handleEditCollection(collection);
                                }}
                              >
                                Update
                              </button>
                              <button
                                type="button"
                                className="w-full rounded-xl px-3 py-2 text-left text-slate-200 transition hover:bg-slate-800/60"
                                onClick={() => handleDeleteCollection(collection)}
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                className="w-full rounded-xl px-3 py-2 text-left text-slate-200 transition hover:bg-slate-800/60"
                                onClick={() => {
                                  setCollectionMenuOpen(null);
                                  handleClearCollectionState(collection);
                                }}
                              >
                                Clear State
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {showSavedModal && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 backdrop-blur"
          role="status"
          aria-live="polite"
        >
          <div className="rounded-2xl border border-emerald-400/40 bg-slate-950/90 px-6 py-4 text-sm uppercase tracking-[0.3em] text-emerald-200 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
            Saved successfully
          </div>
        </div>
      )}

      {showCollectionModal && (
        <div className="fixed inset-0 z-50 grid place-items-center px-4" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur"
            onClick={closeCollectionModal}
            role="presentation"
          />
          <div className="relative w-full max-w-md rounded-3xl border border-slate-800/70 bg-slate-950/95 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
            <h3 className="text-lg font-semibold text-slate-100">
              {editingCollection ? "Update Collection" : "Create Collection"}
            </h3>
            <div className="mt-4 space-y-3">
              <input
                className="w-full rounded-2xl border border-slate-700/80 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/70 focus:outline-none"
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
                className="w-full rounded-2xl border border-slate-700/80 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/70 focus:outline-none"
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
                className="w-full rounded-2xl border border-slate-700/80 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/70 focus:outline-none"
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
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCreateCollection}
                className="rounded-full border border-emerald-400/60 bg-emerald-400/10 px-5 py-2 text-xs uppercase tracking-[0.3em] text-emerald-200"
              >
                {editingCollection ? "Update" : "Create"}
              </button>
              <button
                type="button"
                onClick={closeCollectionModal}
                className="rounded-full border border-slate-700/70 px-5 py-2 text-xs uppercase tracking-[0.3em] text-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Panel;
