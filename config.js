// Ticket Booth — runtime configuration.
//
// Where the accounts/leaderboard backend lives. This is the ONE line to edit
// after you deploy the server to a free host (Render/Fly/Railway):
//
//   window.TICKET_BOOTH_API = "https://your-backend.onrender.com";
//
// Rules:
//   • Leave it as "" (empty) to call the SAME origin that served the page.
//     That's correct for local dev (`npm start` → http://localhost:3000).
//   • Set it to your deployed backend's URL when the game is hosted somewhere
//     that can't run the server (e.g. GitHub Pages).
//
// When the page is opened directly as a file:// (no server at all), the game
// still runs on local storage; accounts/leaderboard just show as offline.

window.TICKET_BOOTH_API = "";
