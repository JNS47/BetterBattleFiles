//  clear the config
function clearConfig(){
  chrome.storage.sync.clear();
}

//  set the whole config
function setConfig(config){
  chrome.storage.sync.set({config: config});
}

//  set a single config option, remove it if it's empty
function setConfigOption(key, value){
  chrome.storage.sync.get(null, (result) =>{
    let config = result["config"];
    if(!config)
      config = {};
    if(value)
      config[key] = value;
    else
      delete config[key];
    chrome.storage.sync.set({config: config});
  });
}

//  get the whole config
async function getConfig(callback){
  chrome.storage.sync.get(null, (result) =>{
    let config = result["config"];
    if(!config)
      config = {};
    callback(config);
  });
}

//  get a single config option
function getConfigOption(key, callback){
  chrome.storage.sync.get(null, (result) =>{
    let config = result["config"];
    if(!config)
      config = {};
    callback(config[key]);
  });
}

//  set the config to it's defaults
function setConfigDefaults(){
  setConfig(defaultConfig);
}