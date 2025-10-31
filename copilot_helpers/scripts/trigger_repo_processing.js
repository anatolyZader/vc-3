// Quick script to trigger manual repository processing and create the namespace
// This will populate the Pinecone index with the correct namespace

async function triggerRepoProcessing() {
  console.log('🚀 Triggering manual repository processing...');
  console.log('This will create the namespace and populate it with vectors');
  
  const payload = {
    repoUrl: "https://github.com/anatolyZader/vc-3",
    userId: "d41402df-182a-41ec-8f05-153118bf2718",
    force: true // Force reprocessing even if already processed
  };
  
  try {
    console.log('📡 Calling manual processing endpoint...');
    const response = await fetch('https://eventstorm.me/api/ai/manual-process-repo-direct', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Repository processing triggered successfully:');
      console.log(JSON.stringify(result, null, 2));
      console.log('\n⏰ Processing will take 5-15 minutes');
      console.log('📊 Check Pinecone console to see namespace creation progress');
      console.log('🎯 Expected namespace: d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3');
    } else {
      const error = await response.text();
      console.error('❌ Failed to trigger processing:', response.status, error);
    }
  } catch (error) {
    console.error('❌ Error calling endpoint:', error.message);
  }
}

triggerRepoProcessing();