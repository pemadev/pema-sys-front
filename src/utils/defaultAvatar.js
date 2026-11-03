// Foto default (siluet user) bila foto profil belum ada atau gagal dimuat
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
  '<rect width="100" height="100" fill="#dfe3e8"/>' +
  '<circle cx="50" cy="38" r="18" fill="#9aa4b1"/>' +
  '<path d="M14 100c0-22 16-36 36-36s36 14 36 36z" fill="#9aa4b1"/></svg>';

export const DEFAULT_AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

export const onAvatarError = (e) => {
  e.currentTarget.onerror = null;
  e.currentTarget.src = DEFAULT_AVATAR;
};
