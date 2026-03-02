"use client";

import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import swal from "sweetalert";
import imagesGetter from "../../../../Helpers/imagesGetter";

const Panel = ({
  imagesUpdate,
  loader,
  activeSlide,
  slideToUpdate,
  albums,
  setAlbums,
  activeAlbum,
  setActiveAlbum,
  setViewMode,
  albumActionsRef,
}) => {
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
  const [albumMenuOpen, setAlbumMenuOpen] = useState(null);
  const [editingCollection, setEditingCollection] = useState(null);
  const [collectionForm, setCollectionForm] = useState({
    name: "",
    image: "",
    query: "",
  });
  const [albumsOpen, setAlbumsOpen] = useState(false);
  const [showAlbumModal, setShowAlbumModal] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState(null);
  const [albumForm, setAlbumForm] = useState({
    name: "",
    image: "",
  });
  const [driveConnected, setDriveConnected] = useState(false);
  const saveTimeoutRef = useRef(null);
  const tokenClientRef = useRef(null);
  const accessTokenRef = useRef(null);
  const tokenExpiryRef = useRef(0);
  const collectionsLoadedRef = useRef(false);
  const albumsLoadedRef = useRef(false);

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
  const ALBUMS_FOLDER_NAME =
    process.env.NEXT_PUBLIC_GOOGLE_DRIVE_ALBUMS_FOLDER_NAME || "albums";
  const ALBUMS_INDEX_FILE =
    process.env.NEXT_PUBLIC_GOOGLE_DRIVE_ALBUMS_INDEX_FILE || "albums.json";
  const ALBUM_IMAGES_FILE =
    process.env.NEXT_PUBLIC_GOOGLE_DRIVE_ALBUM_IMAGES_FILE || "images.json";
  const DEFAULT_ALBUM_NAME = "favorate";

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

  const ensureDefaultAlbum = async () => {
    if (albums.some((album) => album.name === DEFAULT_ALBUM_NAME)) {
      return;
    }
    const defaultAlbum = {
      name: DEFAULT_ALBUM_NAME,
      image: "",
      images: [],
    };
    const nextAlbums = [...albums, defaultAlbum];
    setAlbums(nextAlbums);
  };

  useEffect(() => {
    ensureDefaultAlbum();
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
        const cachedToken = localStorage.getItem("googleDriveToken");
        const cachedExpiry = Number(
          localStorage.getItem("googleDriveTokenExpiry") || 0
        );
        const hasValidCachedToken =
          Boolean(cachedToken) && cachedExpiry && Date.now() < cachedExpiry;
        if (hasValidCachedToken) {
          accessTokenRef.current = cachedToken;
          tokenExpiryRef.current = cachedExpiry;
          setDriveConnected(true);
          loadCollectionsFromDrive(cachedToken)
            .then(() => {
              collectionsLoadedRef.current = true;
            })
            .catch(() => {});
          loadAlbumsFromDrive(cachedToken)
            .then(() => {
              albumsLoadedRef.current = true;
            })
            .catch(() => {});
          return;
        }
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
            setDriveConnected(true);
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
      setActiveAlbum(null);
      setViewMode("carousel");
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
      setActiveAlbum(null);
      setViewMode("carousel");
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
      setActiveAlbum(null);
      setViewMode("carousel");
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
      if (res.status === 401 || res.status === 403) {
        accessTokenRef.current = null;
        tokenExpiryRef.current = 0;
        localStorage.removeItem("googleDriveToken");
        localStorage.removeItem("googleDriveTokenExpiry");
      }
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

  const getAlbumsRootId = async (token, parentFolderId) => {
    const folders = await listDriveFiles(
      token,
      `name='${escapeDriveQuery(ALBUMS_FOLDER_NAME)}' and mimeType='application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed=false`
    );
    return folders[0]?.id || null;
  };

  const getOrCreateAlbumsRootId = async (token, parentFolderId) => {
    const existingId = await getAlbumsRootId(token, parentFolderId);
    if (existingId) {
      return existingId;
    }
    const res = await driveRequest(token, "/drive/v3/files?fields=id", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: ALBUMS_FOLDER_NAME,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentFolderId],
      }),
    });
    const data = await res.json();
    return data.id;
  };

  const getAlbumFolderId = async (token, albumsRootId, albumName) => {
    const folders = await listDriveFiles(
      token,
      `name='${escapeDriveQuery(albumName)}' and mimeType='application/vnd.google-apps.folder' and '${albumsRootId}' in parents and trashed=false`
    );
    return folders[0]?.id || null;
  };

  const getOrCreateAlbumFolderId = async (token, albumsRootId, albumName) => {
    const existingId = await getAlbumFolderId(token, albumsRootId, albumName);
    if (existingId) {
      return existingId;
    }
    const res = await driveRequest(token, "/drive/v3/files?fields=id", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: albumName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [albumsRootId],
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

  const loadAlbumsFromDrive = async (token) => {
    const rootFolderId = await getOrCreateDriveFolder(token);
    const albumsRootId = await getOrCreateAlbumsRootId(token, rootFolderId);
    let albumsIndexId = await getDriveFileId(
      token,
      albumsRootId,
      ALBUMS_INDEX_FILE
    );
    let list = [];
    if (!albumsIndexId) {
      list = [
        {
          name: DEFAULT_ALBUM_NAME,
          image: "",
        },
      ];
      await createDriveFile(
        token,
        albumsRootId,
        JSON.stringify(list),
        ALBUMS_INDEX_FILE
      );
      await saveAlbumImagesToDrive(token, DEFAULT_ALBUM_NAME, []);
    } else {
      const data = await downloadDriveFile(token, albumsIndexId);
      list = Array.isArray(data) ? data : data?.albums || [];
    }
    if (!list.some((album) => album.name === DEFAULT_ALBUM_NAME)) {
      list = [
        ...list,
        {
          name: DEFAULT_ALBUM_NAME,
          image: "",
        },
      ];
      await syncAlbumsIndexToDrive(token, list);
      await saveAlbumImagesToDrive(token, DEFAULT_ALBUM_NAME, []);
    }

    const hydrated = await Promise.all(
      list.map(async (album) => {
        const images = await loadAlbumImagesFromDrive(token, album.name);
        return { ...album, images };
      })
    );
    setAlbums(hydrated);
    return hydrated;
  };

  const syncAlbumsIndexToDrive = async (token, list) => {
    const rootFolderId = await getOrCreateDriveFolder(token);
    const albumsRootId = await getOrCreateAlbumsRootId(token, rootFolderId);
    const albumsIndexId = await getDriveFileId(
      token,
      albumsRootId,
      ALBUMS_INDEX_FILE
    );
    const payload = JSON.stringify(list);
    if (albumsIndexId) {
      await updateDriveFile(token, albumsIndexId, payload);
    } else {
      await createDriveFile(token, albumsRootId, payload, ALBUMS_INDEX_FILE);
    }
  };

  const loadAlbumImagesFromDrive = async (token, albumName) => {
    const rootFolderId = await getDriveFolderId(token);
    if (!rootFolderId) {
      return [];
    }
    const albumsRootId = await getAlbumsRootId(token, rootFolderId);
    if (!albumsRootId) {
      return [];
    }
    const albumFolderId = await getAlbumFolderId(
      token,
      albumsRootId,
      albumName
    );
    if (!albumFolderId) {
      return [];
    }
    const imagesFileId = await getDriveFileId(
      token,
      albumFolderId,
      ALBUM_IMAGES_FILE
    );
    if (!imagesFileId) {
      return [];
    }
    const data = await downloadDriveFile(token, imagesFileId);
    return Array.isArray(data) ? data : data?.images || [];
  };

  const saveAlbumImagesToDrive = async (token, albumName, images) => {
    const rootFolderId = await getOrCreateDriveFolder(token);
    const albumsRootId = await getOrCreateAlbumsRootId(token, rootFolderId);
    const albumFolderId = await getOrCreateAlbumFolderId(
      token,
      albumsRootId,
      albumName
    );
    const imagesFileId = await getDriveFileId(
      token,
      albumFolderId,
      ALBUM_IMAGES_FILE
    );
    const payload = JSON.stringify(images);
    if (imagesFileId) {
      await updateDriveFile(token, imagesFileId, payload);
    } else {
      await createDriveFile(token, albumFolderId, payload, ALBUM_IMAGES_FILE);
    }
  };

  const ensureDriveReady = async ({ promptMode = "none" } = {}) => {
    const token = await ensureAccessToken({ promptMode });
    let loadedCollections = collections;
    if (!collectionsLoadedRef.current) {
      loadedCollections = await loadCollectionsFromDrive(token);
      collectionsLoadedRef.current = true;
    }
    if (!albumsLoadedRef.current) {
      await loadAlbumsFromDrive(token);
      albumsLoadedRef.current = true;
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
    setActiveCollection(collection);
    textUpdate(query);
    setActiveAlbum(null);
    setViewMode("carousel");
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

  const openAlbumModal = () => {
    setEditingAlbum(null);
    setShowAlbumModal(true);
  };

  const closeAlbumModal = () => {
    setShowAlbumModal(false);
    setEditingAlbum(null);
    setAlbumForm({ name: "", image: "" });
  };

  const handleCreateAlbum = async () => {
    const trimmedName = albumForm.name.trim();
    const trimmedImage = albumForm.image.trim();
    if (!trimmedName) {
      await swal({
        title: "Please add an album name",
      });
      return;
    }
    const duplicate = albums.some((item) => {
      if (
        editingAlbum &&
        item.name.trim().toLowerCase() ===
          editingAlbum.name.trim().toLowerCase()
      ) {
        return false;
      }
      return item.name.trim().toLowerCase() === trimmedName.toLowerCase();
    });
    if (duplicate) {
      await swal({
        title: "Album name already exists",
      });
      return;
    }

    let nextAlbums = [];
    let nextActive = activeAlbum;
    if (editingAlbum) {
      const updatedAlbum = {
        ...editingAlbum,
        name: trimmedName,
        image: trimmedImage,
      };
      nextAlbums = albums.map((item) =>
        item.name === editingAlbum.name ? updatedAlbum : item
      );
      setAlbums(nextAlbums);
      if (activeAlbum?.name === editingAlbum.name) {
        setActiveAlbum(updatedAlbum);
        nextActive = updatedAlbum;
      }
      closeAlbumModal();
    } else {
      const newAlbum = {
        name: trimmedName,
        image: trimmedImage,
        images: [],
      };
      nextAlbums = [...albums, newAlbum];
      setAlbums(nextAlbums);
      setActiveAlbum(newAlbum);
      nextActive = newAlbum;
      setViewMode("grid");
      imagesUpdate([]);
      closeAlbumModal();
    }

    try {
      const token = await ensureAccessToken({ promptMode: "consent" });
      await syncAlbumsIndexToDrive(token, nextAlbums);
      await saveAlbumImagesToDrive(
        token,
        nextActive.name,
        nextActive.images || []
      );
      albumsLoadedRef.current = true;
    } catch (error) {
      // ignore if not connected
    }
  };

  const handleEditAlbum = (album) => {
    setEditingAlbum(album);
    setAlbumForm({
      name: album.name || "",
      image: album.image || "",
    });
    setShowAlbumModal(true);
  };

  const handleDeleteAlbum = async (album) => {
    const confirmDelete = await swal({
      title: "Delete album?",
      text: `Are you sure you want to delete "${album.name}"?`,
      buttons: ["Cancel", "Delete"],
      dangerMode: true,
    });
    if (!confirmDelete) {
      return;
    }
    const nextAlbums = albums.filter((item) => item.name !== album.name);
    setAlbums(nextAlbums);
    if (activeAlbum?.name === album.name) {
      setActiveAlbum(null);
    }
    try {
      const token = await ensureAccessToken({ promptMode: "none" });
      const rootFolderId = await getDriveFolderId(token);
      if (rootFolderId) {
        const albumsRootId = await getAlbumsRootId(token, rootFolderId);
        if (albumsRootId) {
          await syncAlbumsIndexToDrive(token, nextAlbums);
          const albumFolderId = await getAlbumFolderId(
            token,
            albumsRootId,
            album.name
          );
          if (albumFolderId) {
            await deleteDriveFile(token, albumFolderId);
          }
        }
      }
    } catch (error) {
      await swal({
        title: "Google Drive sync failed",
        text: getDriveErrorMessage(error),
      });
    }
  };

  const handleSelectAlbum = async (album) => {
    setActiveCollection(null);
    setActiveAlbum(album);
    setViewMode("grid");
    slideToUpdate(0);
    setAlbumsOpen(false);
    loader(true);
    setImageUrls([]);
    imagesUpdate([]);
    try {
      if (!driveConnected) {
        const localImages = album.images || [];
        setImageUrls(localImages);
        imagesUpdate(localImages);
        loader(false);
        return;
      }
      const token = await ensureAccessToken({ promptMode: "none" });
      const hydratedAlbums = await loadAlbumsFromDrive(token);
      const hydrated = hydratedAlbums.find((item) => item.name === album.name);
      const resolvedImages = hydrated?.images || album.images || [];
      const nextAlbums = albums.map((item) =>
        item.name === album.name ? { ...item, images: resolvedImages } : item
      );
      setAlbums(nextAlbums);
      setImageUrls(resolvedImages);
      imagesUpdate(resolvedImages);
      loader(false);
    } catch (error) {
      const localImages = album.images || [];
      setImageUrls(localImages);
      imagesUpdate(localImages);
      loader(false);
    }
  };

  const addImageToAlbum = async (slide, albumName) => {
    const target = albums.find((item) => item.name === albumName);
    if (!target) {
      await swal({ title: "Album not found" });
      return;
    }
    let images = target.images || [];
    if (!target.images) {
      try {
        const token = await ensureAccessToken({ promptMode: "none" });
        images = await loadAlbumImagesFromDrive(token, albumName);
      } catch (error) {
        images = [];
      }
    }
    const exists = images.some((item) => item.url === slide.url);
    if (!exists) {
      images = [...images, { ...slide, id: slide.id || slide.url }];
    }
    const nextAlbums = albums.map((item) =>
      item.name === albumName ? { ...item, images } : item
    );
    setAlbums(nextAlbums);
    if (activeAlbum?.name === albumName) {
      setActiveAlbum({ ...target, images });
      setImageUrls(images);
      imagesUpdate(images);
    }
    try {
      const token = await ensureAccessToken({ promptMode: "none" });
      await saveAlbumImagesToDrive(token, albumName, images);
      await syncAlbumsIndexToDrive(token, nextAlbums);
      await swal({ title: "Added to album" });
    } catch (error) {
      await swal({ title: "Saved locally", text: "Connect Drive to sync." });
    }
  };

  const removeImageFromActiveAlbum = async (slide) => {
    if (!activeAlbum) {
      await swal({ title: "No active album selected" });
      return;
    }
    const images = (activeAlbum.images || []).filter(
      (item) => item.url !== slide.url
    );
    const nextAlbums = albums.map((item) =>
      item.name === activeAlbum.name ? { ...item, images } : item
    );
    setAlbums(nextAlbums);
    setActiveAlbum({ ...activeAlbum, images });
    setImageUrls(images);
    imagesUpdate(images);
    try {
      const token = await ensureAccessToken({ promptMode: "none" });
      await saveAlbumImagesToDrive(token, activeAlbum.name, images);
      await syncAlbumsIndexToDrive(token, nextAlbums);
      await swal({ title: "Removed from album" });
    } catch (error) {
      await swal({ title: "Saved locally", text: "Connect Drive to sync." });
    }
  };

  useEffect(() => {
    if (albumActionsRef) {
      albumActionsRef.current = {
        addImageToAlbum,
        removeImageFromActiveAlbum,
      };
    }
  }, [albums]);

  const handleConnectDrive = async () => {
    try {
      const { token } = await ensureDriveReady({ promptMode: "consent" });
      await loadCollectionsFromDrive(token);
      collectionsLoadedRef.current = true;
      await loadAlbumsFromDrive(token);
      albumsLoadedRef.current = true;
      setDriveConnected(true);
      await swal({ title: "Google Drive connected" });
    } catch (error) {
      await swal({
        title: "Google sign-in required",
        text: "Please sign in to Google in this browser, then try Connect again.",
      });
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
      <button
        type="button"
        onClick={() => setAlbumsOpen((state) => !state)}
        className="fixed bottom-6 left-6 z-40 flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-950/80 px-4 py-2 text-xs uppercase tracking-[0.35em] text-emerald-300 shadow-[0_12px_40px_rgba(0,0,0,0.55)] transition hover:border-emerald-400/60"
      >
        Albums
      </button>

      <section
        className={`fixed inset-y-0 left-0 z-30 flex w-[360px] max-w-[92vw] flex-col overflow-hidden border-r border-slate-800/70 bg-slate-950/90 backdrop-blur transition-transform duration-300 ${
          albumsOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-800/70 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-emerald-300/70">
              Albums
            </p>
            <h2 className="text-lg font-semibold">Your image albums</h2>
          </div>
          <button
            type="button"
            onClick={() => setAlbumsOpen(false)}
            className="rounded-full border border-slate-700/70 px-3 py-1 text-xs uppercase tracking-[0.25em] text-slate-300"
          >
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              className="rounded-full border border-slate-700/70 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-slate-200"
              onClick={openAlbumModal}
              type="button"
            >
              Add
            </button>
            <button
              className="rounded-full border border-emerald-400/60 bg-emerald-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-emerald-200"
              onClick={() => setViewMode("carousel")}
              type="button"
            >
              Carousel mode
            </button>
          </div>
          <div className="mt-5 space-y-3">
            {albums.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700/70 p-4 text-center text-xs text-slate-400">
                No albums yet. Add one to get started.
              </div>
            ) : (
              albums.map((album) => (
                <div
                  key={album.name}
                  className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-2 transition ${
                    activeAlbum?.name === album.name
                      ? "border-emerald-400/60 bg-emerald-400/10"
                      : "border-slate-800/70 bg-slate-950/40"
                  }`}
                >
                  <button
                    className="flex flex-1 items-center gap-3 text-left"
                    onClick={() => handleSelectAlbum(album)}
                    type="button"
                  >
                    <img
                      src={album.image || "https://placehold.co/80x80"}
                      alt={album.name}
                      className="h-12 w-12 rounded-xl object-cover"
                    />
                    <div>
                      <p className="text-sm font-semibold text-slate-100">
                        {album.name}
                      </p>
                    </div>
                  </button>
                  <div className="relative">
                    <button
                      className="rounded-full border border-slate-700/70 px-2 py-1 text-xs text-slate-200"
                      type="button"
                      onClick={() =>
                        setAlbumMenuOpen((state) =>
                          state === album.name ? null : album.name
                        )
                      }
                    >
                      More
                    </button>
                    {albumMenuOpen === album.name && (
                      <div className="absolute right-0 top-full z-10 mt-2 w-36 rounded-2xl border border-slate-800/80 bg-slate-950/95 p-2 text-xs">
                        <button
                          type="button"
                          className="w-full rounded-xl px-3 py-2 text-left text-slate-200 transition hover:bg-slate-800/60"
                          onClick={() => {
                            setAlbumMenuOpen(null);
                            handleEditAlbum(album);
                          }}
                        >
                          Update
                        </button>
                        <button
                          type="button"
                          className="w-full rounded-xl px-3 py-2 text-left text-slate-200 transition hover:bg-slate-800/60"
                          onClick={() => handleDeleteAlbum(album)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

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
                    {activeCollection?.name || activeAlbum?.name || "Unassigned"}
                  </p>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <p>Stack #{count + 1}</p>
                  <p>Slide {activeSlide + 1}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={`rounded-full border px-3 py-1 uppercase tracking-[0.3em] ${
                    driveConnected
                      ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-200"
                      : "border-slate-700/70 text-slate-400"
                  }`}
                >
                  {driveConnected ? "Drive connected" : "Drive not connected"}
                </span>
                {!driveConnected && (
                  <button
                    type="button"
                    onClick={handleConnectDrive}
                    className="rounded-full border border-emerald-400/60 bg-emerald-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-emerald-200"
                  >
                    Connect
                  </button>
                )}
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

      {showAlbumModal && (
        <div className="fixed inset-0 z-50 grid place-items-center px-4" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur"
            onClick={closeAlbumModal}
            role="presentation"
          />
          <div className="relative w-full max-w-md rounded-3xl border border-slate-800/70 bg-slate-950/95 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
            <h3 className="text-lg font-semibold text-slate-100">
              {editingAlbum ? "Update Album" : "Create Album"}
            </h3>
            <div className="mt-4 space-y-3">
              <input
                className="w-full rounded-2xl border border-slate-700/80 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/70 focus:outline-none"
                type="text"
                placeholder="Album name"
                value={albumForm.name}
                onChange={(event) =>
                  setAlbumForm((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
              />
              <input
                className="w-full rounded-2xl border border-slate-700/80 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/70 focus:outline-none"
                type="text"
                placeholder="Image URL"
                value={albumForm.image}
                onChange={(event) =>
                  setAlbumForm((prev) => ({
                    ...prev,
                    image: event.target.value,
                  }))
                }
              />
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCreateAlbum}
                className="rounded-full border border-emerald-400/60 bg-emerald-400/10 px-5 py-2 text-xs uppercase tracking-[0.3em] text-emerald-200"
              >
                {editingAlbum ? "Update" : "Create"}
              </button>
              <button
                type="button"
                onClick={closeAlbumModal}
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
