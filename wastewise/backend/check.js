const axios = require('axios');
async function check() {
  try {
    const vercel = await axios.get('https://api.vercel.com/v9/projects', { headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` }});
    const projects = vercel.data.projects;
    console.log('Vercel Projects:', projects.map(p => p.name));
    if(projects.length > 0) {
      const deps = await axios.get(`https://api.vercel.com/v6/deployments?projectId=${projects[0].id}`, { headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` }});
      console.log('Latest Vercel Deployments:', deps.data.deployments.slice(0,2).map(d => ({ state: d.state, created: new Date(d.created).toLocaleString(), url: d.url })));
    }
    const render = await axios.get('https://api.render.com/v1/services', { headers: { Authorization: `Bearer ${process.env.RENDER_TOKEN}` }});
    const services = render.data;
    console.log('Render Services:', services.map(s => s.service.name));
    if(services.length > 0) {
      const deps2 = await axios.get(`https://api.render.com/v1/services/${services[0].service.id}/deploys`, { headers: { Authorization: `Bearer ${process.env.RENDER_TOKEN}` }});
      console.log('Latest Render Deployments:', deps2.data.slice(0,2).map(d => ({ status: d.deploy.status, created: new Date(d.deploy.createdAt).toLocaleString() })));
    }
  } catch(e) {
    console.error('Error:', e.response ? JSON.stringify(e.response.data) : e.message);
  }
}
check();
