#!/usr/bin/env node

// 🚀 Render API Deployment Script
// Uses Render API to deploy the Social Media Engagement Marketplace

import https from 'https';

const RENDER_API_KEY = 'rnd_iTY9Hw3K2wOFSs54xGBJASjhI5nk';
const GITHUB_REPO = 'weblisite/socialitix-marketplace';

// Environment variables for the deployment
const ENV_VARS = {
  NODE_ENV: 'production',
  SUPABASE_URL: 'https://xevnhgizberlburnxuzh.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhldm5oZ2l6YmVybGJ1cm54dXpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5NDY3NzQsImV4cCI6MjA2ODUyMjc3NH0.GjjC9I-__p0e4nez0Dar71p2zMFjd2sX2K2K_xBYRl4',
  INTASEND_API_PUBLISHABLE_KEY: 'ISPubKey_live_8e8857a5-54ad-4d06-8537-4557857db13b',
  INTASEND_API_SECRET_KEY: 'ISSecretKey_live_dc9cf272-1dfc-42da-a300-aca01256e0f5'
};

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.render.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${RENDER_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function deployToRender() {
  console.log('🚀 Starting Render deployment...\n');

  try {
    // Step 1: Get user info
    console.log('1. Checking API key...');
    const userResponse = await makeRequest('GET', '/v1/user');
    if (userResponse.status !== 200) {
      throw new Error(`API key invalid: ${userResponse.status}`);
    }
    console.log('✅ API key valid\n');

    // Step 2: Create service
    console.log('2. Creating web service...');
    const serviceData = {
      name: 'socialitix-marketplace',
      type: 'web_service',
      repo: GITHUB_REPO,
      branch: 'main',
      buildCommand: 'npm ci && npm run build',
      startCommand: 'npm start',
      envVars: Object.entries(ENV_VARS).map(([key, value]) => ({
        key,
        value
      }))
    };

    const serviceResponse = await makeRequest('POST', '/v1/services', serviceData);
    if (serviceResponse.status !== 201) {
      throw new Error(`Failed to create service: ${JSON.stringify(serviceResponse.data)}`);
    }

    const serviceId = serviceResponse.data.id;
    console.log(`✅ Service created with ID: ${serviceId}\n`);

    // Step 3: Wait for deployment
    console.log('3. Waiting for deployment to start...');
    let deploymentId = null;
    let attempts = 0;
    
    while (!deploymentId && attempts < 10) {
      const deploymentsResponse = await makeRequest('GET', `/v1/services/${serviceId}/deploys`);
      if (deploymentsResponse.status === 200 && deploymentsResponse.data.length > 0) {
        deploymentId = deploymentsResponse.data[0].id;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }

    if (!deploymentId) {
      throw new Error('Deployment not started');
    }

    console.log(`✅ Deployment started with ID: ${deploymentId}\n`);

    // Step 4: Monitor deployment
    console.log('4. Monitoring deployment...');
    let isComplete = false;
    attempts = 0;

    while (!isComplete && attempts < 30) {
      const deployResponse = await makeRequest('GET', `/v1/services/${serviceId}/deploys/${deploymentId}`);
      
      if (deployResponse.status === 200) {
        const deploy = deployResponse.data;
        console.log(`Status: ${deploy.status} (${attempts + 1}/30)`);
        
        if (deploy.status === 'live') {
          isComplete = true;
          console.log('✅ Deployment successful!');
          console.log(`🌐 Your app is live at: ${deploy.service.url}`);
          break;
        } else if (deploy.status === 'failed') {
          throw new Error('Deployment failed');
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      attempts++;
    }

    if (!isComplete) {
      console.log('⚠️ Deployment is taking longer than expected. Check Render dashboard for status.');
    }

  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

// Run the deployment
deployToRender(); 