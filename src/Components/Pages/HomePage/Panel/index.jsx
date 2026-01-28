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
  const saveTimeoutRef = useRef(null);
  const tokenClientRef = useRef(null);
  const accessTokenRef = useRef(null);
  const tokenExpiryRef = useRef(0);

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
      const token = await ensureAccessToken();
      const folderId = await getDriveFolderId(token);
      if (!folderId) {
        await swal({
          title: "No saved state found in Google Drive",
        });
        return;
      }
      const fileId = await getDriveFileId(token, folderId);
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

  const ensureAccessToken = async () => {
    if (!GOOGLE_CLIENT_ID) {
      throw new Error("Missing Google client ID.");
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
        resolve(accessTokenRef.current);
      };
      tokenClientRef.current.requestAccessToken({
        prompt: accessTokenRef.current ? "" : "consent",
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

  const getDriveFileId = async (token, folderId) => {
    const files = await listDriveFiles(
      token,
      `name='${DRIVE_FILE_NAME}' and '${folderId}' in parents and trashed=false`
    );
    return files[0]?.id || null;
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

  const createDriveFile = async (token, folderId, content) => {
    const metadata = {
      name: DRIVE_FILE_NAME,
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

  const syncStateToDrive = async () => {
    try {
      const token = await ensureAccessToken();
      const folderId = await getOrCreateDriveFolder(token);
      const fileId = await getDriveFileId(token, folderId);
      const payload = JSON.stringify(buildStatePayload());
      if (fileId) {
        await updateDriveFile(token, fileId, payload);
      } else {
        await createDriveFile(token, folderId, payload);
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

  return (
    <Section className={classes}>
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
    </Section>
  );
};

export default Panel;
