//  set values of all inputs by their config value
function setConfigValues(){
  //  set default config if config is empty
  getConfig((cfg) =>{
    if(Object.keys(cfg).length < 1)
      setConfigDefaults();
    //  text / number inputs
    const configOptionElements = document.querySelectorAll(".configOption");
    for(let el of configOptionElements){
      el.addEventListener("change", (event) =>{ setConfigOption(event.target.name, event.target.value); });
      getConfigOption(el.name, (val) =>{
        if(val)
          el.value = val;
      });
    }

    getConfigOption("extensionIsActive", (val) =>{
      //  activated / deactivated button, + set class
      const activeBtnElement = document.querySelector(".toggle-btn");
      if(activeBtnElement){
        activeBtnElement.addEventListener("click", (event) =>{ toggleExtension(event.target); });
        if(val != activeBtnElement.classList.contains("active"))
          toggleExtension(activeBtnElement);
      }
      const helpBtnElement = document.querySelector(".help-btn");
      if(helpBtnElement)
        helpBtnElement.addEventListener("click", () =>{ document.querySelector('.help').classList.toggle('hidden'); });
      const resetBtnElement = document.querySelector(".click-btn");
      if(resetBtnElement)
        resetBtnElement.addEventListener("click", () =>{ resetConfig(); });
    });
  });
}

//  toggle class for the activated / deactivated button and save it to config
function toggleExtension(el){
  el.classList.toggle("active");
  let text = "Aktivieren";
  if(el.classList.contains("active"))
    text = "Deaktivieren";
  el.previousElementSibling.innerHTML = text;
  setConfigOption("extensionIsActive", el.classList.contains("active"));
}

//  clear config and set it to it's defaults
function resetConfig(){
  clearConfig();
  setConfigDefaults();
  setConfigValues();
}

//  set config values on start
setConfigValues();

/*-----------------------------------------------------------------*/

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