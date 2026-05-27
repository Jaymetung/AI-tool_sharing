// Firebase Realtime Database — sync layer
// Seeds default data on first run, then keeps everything in real-time sync.

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBwq39B8b2tQYqgB6WE35dFE_3TnLXAyy4",
  authDomain: "ai-sharing-tool.firebaseapp.com",
  databaseURL: "https://ai-sharing-tool-default-rtdb.firebaseio.com",
  projectId: "ai-sharing-tool",
  storageBucket: "ai-sharing-tool.firebasestorage.app",
  messagingSenderId: "397646231963",
  appId: "1:397646231963:web:3df997b3c6cf5cbcdac93e",
};

firebase.initializeApp(FIREBASE_CONFIG);
const _db = firebase.database();

async function fbSeedIfEmpty(defaultTools, defaultUsers, defaultBookings) {
  const snap = await _db.ref('/').once('value');
  if (snap.exists()) return;
  const updates = {};
  defaultTools.forEach((t)  => { updates[`/tools/${t.id}`]    = t; });
  defaultUsers.forEach((u)  => { updates[`/users/${u.id}`]    = u; });
  defaultBookings.forEach((b) => { updates[`/bookings/${b.id}`] = b; });
  await _db.ref('/').update(updates);
}

function fbSubscribe(onData, onError) {
  const state = { tools: null, users: null, bookings: null };
  const notify = () => {
    if (state.tools !== null && state.users !== null && state.bookings !== null)
      onData({ tools: state.tools, users: state.users, bookings: state.bookings });
  };
  const err = onError || console.error;
  _db.ref('/tools').on('value',    (s) => { state.tools    = s.val() ? Object.values(s.val()) : []; notify(); }, err);
  _db.ref('/users').on('value',    (s) => { state.users    = s.val() ? Object.values(s.val()) : []; notify(); }, err);
  _db.ref('/bookings').on('value', (s) => { state.bookings = s.val() ? Object.values(s.val()) : []; notify(); }, err);
  return () => { _db.ref('/tools').off(); _db.ref('/users').off(); _db.ref('/bookings').off(); };
}

const fbSaveBooking   = (b)  => _db.ref(`/bookings/${b.id}`).set(b);
const fbDeleteBooking = (id) => _db.ref(`/bookings/${id}`).remove();
const fbSaveTool      = (t)  => _db.ref(`/tools/${t.id}`).set(t);
const fbDeleteTool    = (id) => _db.ref(`/tools/${id}`).remove();
const fbSaveUser      = (u)  => _db.ref(`/users/${u.id}`).set(u);
const fbDeleteUser    = (id) => _db.ref(`/users/${id}`).remove();

Object.assign(window, {
  fbSeedIfEmpty, fbSubscribe,
  fbSaveBooking, fbDeleteBooking,
  fbSaveTool, fbDeleteTool,
  fbSaveUser, fbDeleteUser,
});
