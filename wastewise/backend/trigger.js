const axios = require('axios');
async function trigger() {
  try {
    const res = await axios.post('https://api.vercel.com/v13/deployments', {
      name: "frontend",
      gitSource: {
        type: "github",
        repo: "tarangkhandelwal622-cpu/WASTE-WISE",
        ref: "main"
      }
    }, {
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_TOKEN}`
      }
    });
    console.log("Triggered Vercel Deployment:", res.data.url);
  } catch(e) {
    console.error("Error triggering Vercel:", e.response ? JSON.stringify(e.response.data) : e.message);
  }
}
trigger();
