var SERVER_URL = "http://192.168.1.105";
// var SERVER_URL = "http://192.168.29.244";
var activePage = "listPrograms";
var selectedDevice = {};
var network_mode = "HOTSPOT";
var network_ssid = "";
var network_password = "";
var network_scanning = false;
var programEditMode = false;
const SSIDSelector = document.getElementById("wifiSSIDSelector");

window.onload = () => {
  console.log("Loaded Ui");
  loadDevicesList();
  handlePageView("listPrograms");
  // handlePageView("addEditProgram");
  // handlePageView("settings");

  disableAllFuseInputs();
};

/////////////////////////////////////////////////////
// UTILS

const sanitizeHex = (element) => {
  element.value = element.value.replace(/[^a-fA-F0-9\n\r]+/g, "").toUpperCase();
};

const format_bytes = (bytes_value) => {
  if (bytes_value < 1024) {
    return `${bytes_value} B`;
  } else {
    if (bytes_value < 1024 * 1024) {
      return `${(bytes_value / 1024).toFixed(2)} KB`;
    } else {
      if (bytes_value < 1024 * 1024 * 1024) {
        return `${(bytes_value / 1024 / 1024).toFixed(2)} MB`;
      }
    }
  }
};

const get_bytes = (size_string) => {
  let size_value = String(size_string).split(" ")[0];
  let size_notation = String(size_string).split(" ")[1];
  switch (size_notation) {
    case "KB":
      {
        return `${size_value * 1024}`;
      }
      break;
    case "MB":
      {
        return `${size_value * 1024 * 1024}`;
      }
      break;

    case "GB":
      {
        return `${size_value * 1024 * 1024 * 1024}`;
      }
      break;

    default:
      break;
  }
  return size_value;
};

/////////////////////////////////////////////////////
/////////////////////////////////////////////////////
/////////////////////////////////////////////////////
/////////////////////////////////////////////////////
/////////////////////////////////////////////////////

//API CALLS

const updateNetworkSSID = (elem) => {
  network_ssid = elem.value;
};
const updateNetworkPassword = (elem) => {
  network_password = elem.value;
};

const saveNetworkConfig = () => {
  console.log(
    "Saving Network Config:",
    network_mode,
    network_ssid,
    network_password
  );

  const body = new FormData();
  body.append("mode", network_mode == "HOTSPOT" ? 0 : 1);
  body.append("ssid", network_ssid);
  body.append("password", network_password);
  fetch(`${SERVER_URL}/wifi_config`, {
    body,
    method: "POST",
  })
    .then((res) => {
      res.text().then((data) => {
        console.log(data);
      });
    })
    .catch((err) => {
      console.log(err);
    });
};
const scan_networks = () => {
  const scanLoader = document.getElementById("scanLoader");
  const scanButton = document.getElementById("scanButton");
  SSIDSelector.disabled = true;
  scanButton.style.display = "none";
  scanLoader.style.display = "block";
  fetch(`${SERVER_URL}/scan_networks`)
    .then((response) => response.json())
    .then((data) => {
      console.log(data);
      setScannedNetworks(data);
      scanLoader.style.display = "none";
      scanButton.style.display = "block";
      SSIDSelector.disabled = false;
    })
    .catch((err) => {
      console.error(err);
      scanLoader.style.display = "none";
      scanButton.style.display = "block";
      SSIDSelector.disabled = false;
    });
};

const getSystemDetails = () => {
  fetch(`${SERVER_URL}/system`)
    .then((response) => response.json())
    .then((data) => {
      console.log(data);
      console.log(
        activePage,

        document.getElementById(activePage)
      );
      previewSystemData(data);
      updateMemoryUsageIndicators(data);
      setNetworkData(data);
    })
    .catch((err) => {
      console.error(err);
    });
};

const setNetworkData = (data) => {
  network_mode = data.networkMode;
  network_ssid = data.networkSSID;
  network_password = data.networkPassword;
  console.log("Network Data::", {
    mode: network_mode,
    ssid: network_ssid,
    password: network_password,
  });
  if (network_mode == "HOTSPOT") {
    document.getElementById("hotspot_mode_rb").checked = true;
    document.getElementById("hotspot_ssid").value = network_ssid;
    document.getElementById("hotspot_password").value = network_password;
  } else {
    document.getElementById("wifi_mode_rb").checked = true;

    document.getElementById(
      "wifiSSIDSelector"
    ).innerHTML = `<option disabled selected value="${network_ssid}">${network_ssid} (Active)</option>`;
    document.getElementById("wifiPassword").value = network_password;
  }
  enable_network_fields(network_mode);
};

function enable_network_fields(network_type) {
  let hotspotFileds = document.getElementsByClassName("hotspotField");
  let wifiFileds = document.getElementsByClassName("wifiField");
  if (network_type == "HOTSPOT") {
    for (let index = 0; index < wifiFileds.length; index++) {
      wifiFileds[index].style.display = "none";
    }
    for (let index = 0; index < hotspotFileds.length; index++) {
      hotspotFileds[index].style.display = "block";
    }
  } else {
    for (let index = 0; index < hotspotFileds.length; index++) {
      hotspotFileds[index].style.display = "none";
    }
    for (let index = 0; index < wifiFileds.length; index++) {
      wifiFileds[index].style.display = "block";
    }
  }
}

function setScannedNetworks(data) {
  SSIDSelector.innerHTML = "";
  data.forEach((item) => {
    SSIDSelector.innerHTML += `<option ${
      item.ssid === network_ssid ? "selected" : ""
    } value="${item.ssid}">${item.ssid} ${
      item.ssid === network_ssid ? "(Active)" : ""
    }</option>`;
  });
}

const getAllPrograms = () => {
  fetch(`${SERVER_URL}/programs`)
    .then((response) => response.json())
    .then((data) => {
      console.log("DATA:", data);
      // previewProgramsList(jsonData);
      // previewSystemData(jsonData);
      loadProgramsData(data.reverse());
    })
    .catch((err) => {
      console.error(err);
    });
};

const getProgramDetails = (programName) => {
  return new Promise((resolve, reject) => {
    fetch(`${SERVER_URL}/program/${programName}`)
      .then((response) => response.json())
      .then((data) => {
        console.log("DATA:", data);
        resolve(data);
      })
      .catch((err) => {
        console.error(err);
        reject(err);
      });
  });
};

const deleteProgram = (programName) => {
  console.log("Deleteing:", programName);
  fetch(`${SERVER_URL}/deleteProgram?program_name=${programName}`, {
    method: "POST",
  })
    .then((res) => {
      res.json().then((data) => {
        console.log("DELETED:", programName);
        console.log("RES:", data);
        getSystemDetails();
        getAllPrograms();
      });
    })
    .catch((err) => {
      console.log(err);
    });
};
/////////////////////////////////////////////////////

// document
//   .getElementById("programFormContainer")
//   .addEventListener("submit", (e) => {
//     // e.preventDefault();
//   });

const onNetworkModeChange = (mode) => {
  console.log("Mode changes::", mode);
  network_mode = mode;
  enable_network_fields(mode);
};

function submitFormData(event) {
  event.preventDefault();
  const programName = document.getElementById("programName").value;
  console.log("Submitting Data::", programName);
  // document.getElementById(
  //   "programFormContainer"
  // ).action = `http://192.168.1.104/program?program_name=${programName}`;
  onFormSubmit();

  return true;
}

const onFormSubmit = async () => {
  let formData = new FormData(document.getElementById("programFormContainer"));
  // console.log("Form Data ::", formData.entries().next().value);
  // console.log(formData.selectedDevice);
  let extractedFormData = {};
  for (const pair of formData.entries()) {
    console.log(pair);
    extractedFormData[pair[0]] = pair[1];
  }
  console.log("ED:", extractedFormData);
  let finalFormData = {};
  finalFormData.auto_lock = document.getElementById("autoLock").checked
    ? "true"
    : "false";
  finalFormData.auto_verify = document.getElementById("autoVerify").checked
    ? "true"
    : "false";
  finalFormData.program_name = document.getElementById("programName").value;
  finalFormData.device_id =
    "0x" + selectedDevice.id.split("x")[1].toUpperCase();
  finalFormData.device_name = selectedDevice.name;
  finalFormData.low_fuse =
    document.getElementById("lowBitsInput").value !== ""
      ? "0x" + document.getElementById("lowBitsInput").value
      : "";
  finalFormData.high_fuse =
    document.getElementById("highBitsInput").value !== ""
      ? "0x" + document.getElementById("highBitsInput").value
      : "";
  finalFormData.extended_fuse =
    document.getElementById("extendedBitsInput").value !== ""
      ? "0x" + document.getElementById("extendedBitsInput").value
      : "";
  finalFormData.lock_bits =
    document.getElementById("lockBitsInput").value !== ""
      ? "0x" + document.getElementById("lockBitsInput").value
      : "";
  finalFormData.file = document.getElementById("hexFileUpload").files[0];

  console.log("FFD::", finalFormData);

  const body = new FormData();
  if (!programEditMode) {
    for (var key in finalFormData) {
      body.append(key, finalFormData[key]);
    }
    const res = await fetch(
      `${SERVER_URL}/program?program_name=${finalFormData.program_name}`,
      {
        body,
        method: "POST",
      }
    );
    console.log("RES::", res);
    if (res.status === 200) {
      window.location = "/";
    } else {
      alert("Some Error occurred.");
    }
  } else {
    const editFormFields = [
      "auto_lock",
      "auto_verify",
      "high_fuse",
      "lock_bits",
      "extended_fuse",
      "low_fuse",
    ];
    for (var key in finalFormData) {
      if (editFormFields.includes(key)) {
        body.append(key, finalFormData[key]);
      }
    }
    const res = await fetch(
      `${SERVER_URL}/program/${finalFormData.program_name}`,
      {
        body,
        method: "POST",
      }
    );
    console.log("RES::", res);
    if (res.status === 200) {
      // window.location = "/";
    } else {
      alert("Some Error occurred.");
    }
  }
};

const handleCheckboxChange = (element) => {
  if (element.id === "autoLock") {
    document.getElementById("auto_lock").value = `${element.checked}`;
  } else {
    document.getElementById("auto_verify").value = `${element.checked}`;
  }
};

const handleFileDrop = (event, element) => {
  console.log("File dropped");
  event.preventDefault();
  element.classList.remove("fileUploadContainer--highlighted");

  let uploaderInput = document.getElementById("hexFileUpload");
  // console.log(event.dataTransfer.items);
  if (event.dataTransfer.files.length < 1) {
    return;
  }
  uploaderInput.files = event.dataTransfer.files;
  onFileSelect(document.getElementById("hexFileUpload"));
};
const handleFileDrag = (event, element) => {
  element.classList.add("fileUploadContainer--highlighted");
  event.preventDefault();
};
const browseFileForUpload = (event) => {
  document.getElementById("hexFileUpload").click();
};
const removeUploadedFile = (event) => {
  document.getElementById("headingText").innerText = "Select *.hex file";
  document.getElementById("descriptionText").innerText =
    "Select and upload your code file by clicking here";
  document.getElementById("removeButton").style.display = "none";
  document.getElementById("browseButton").style.display = "block";
  document.getElementById("hexFileUpload").value = "";
  console.log(document.getElementById("hexFileUpload").files[0]);
  document.getElementById("uploadIcon").style.display = "flex";
  document.getElementById("checkIcon").style.display = "none";
};

const handleFileDragEnter = (element) => {
  element.classList.add("fileUploadContainer--highlighted");
};
const handleFileDragLeave = (element) => {
  console.log("Drag done");
  element.classList.remove("fileUploadContainer--highlighted");
};

const onFileSelect = (element) => {
  const uploadedFile = element.files[0];
  console.log("ELEM:", element.files[0]);
  document.getElementById("browseButton").style.display = "none";
  document.getElementById("removeButton").style.display = "block";
  document.getElementById("uploadIcon").style.display = "none";
  document.getElementById("checkIcon").style.display = "flex";
  document.getElementById("headingText").innerText = uploadedFile.name;
  document.getElementById("descriptionText").innerText = `Size: ${format_bytes(
    uploadedFile.size
  )}`;
};

const loadDevicesList = () => {
  const deviceDropdwon = document.getElementById("deviceSelector");
  deviceDropdwon.innerHTML = `<option disabled selected value="">Select a Device</option>`;
  const arch2devices = allDevices.filter((dev) => dev.arch == 2);
  arch2devices.forEach((device) => {
    deviceDropdwon.innerHTML += `  <option value="${
      device.name
    }-${device.id.toUpperCase()}">${device.name}</option>`;
  });
};

const disableAllFuseInputs = () => {
  [
    "lowBitsInput",
    "highBitsInput",
    "extendedBitsInput",
    "lockBitsInput",
  ].forEach((id) => {
    disableFuseInputs(id);
  });
};
const enableAllFuseInputs = () => {
  if (selectedDevice.fuseBytes === 3) {
    [
      "lowBitsInput",
      "highBitsInput",
      "extendedBitsInput",
      "lockBitsInput",
    ].forEach((id) => {
      enableFuseInputs(id);
    });
  } else {
    ["lowBitsInput", "highBitsInput", "lockBitsInput"].forEach((id) => {
      enableFuseInputs(id);
    });
    disableFuseInputs("extendedBitsInput");
  }
};
const disableFuseInputs = (inputID) => {
  document.getElementById(inputID).disabled = true;
  let preText = document
    .getElementById(inputID)
    .parentElement.getElementsByClassName("hexPreText")[0];
  preText.classList.add("hexPreText--disabled");
};

const enableFuseInputs = (inputID) => {
  document.getElementById(inputID).disabled = false;
  let preText = document
    .getElementById(inputID)
    .parentElement.getElementsByClassName("hexPreText")[0];
  preText.classList.remove("hexPreText--disabled");
};

const onDeviceSelect = (element) => {
  console.log("SELECTED:", element.value);
  selectedDevice = allDevices.find(
    (deviceData) => deviceData.name === element.value.split("-")[0]
  );

  document.getElementById("device_name").value = selectedDevice.name;
  document.getElementById("device_id").value = selectedDevice.id;

  console.log("Device Selected:", element.value, selectedDevice);
  enableAllFuseInputs();
};

const previewSystemData = (system_data) => {
  console.log("SYS:", system_data);
  document.querySelector(
    `#${activePage} #versionInfo`
  ).innerText = `Firmware Version: ${system_data.firmwareVersion}`;
};

const navigateToAddProgramsPage = () => {
  handlePageView("addEditProgram");
};
const navigateToListProgramsPage = () => {
  handlePageView("listPrograms");
};

const navigateToSettingsPage = () => {
  handlePageView("settings");
};

const handlePageView = (pageName) => {
  console.log("PAGE:", pageName);
  switch (pageName) {
    case "listPrograms":
      {
        document.getElementById("listProgramsPage").style.display = "flex";
        document.getElementById("settingsPage").style.display = "none";
        document.getElementById("addEditProgramPage").style.display = "none";
        // loadProgramsData();
        activePage = "listProgramsPage";
        getSystemDetails();

        getAllPrograms();
      }
      break;
    case "settings":
      {
        document.getElementById("listProgramsPage").style.display = "none";
        document.getElementById("settingsPage").style.display = "flex";
        document.getElementById("addEditProgramPage").style.display = "none";
        activePage = "settingsPage";
        getSystemDetails();
      }
      break;
    case "addEditProgram":
      {
        document.getElementById("listProgramsPage").style.display = "none";
        document.getElementById("settingsPage").style.display = "none";
        document.getElementById("addEditProgramPage").style.display = "flex";
        activePage = "addEditProgramPage";
        getSystemDetails();
      }
      break;
  }
};

var API_RESPONSE = [
  {
    name: "Test Program-1",
    device: "Device-1",
    size: "2.2KB",
  },
  {
    name: "Test Program-2",
    device: "Device-1",
    size: "2.2KB",
  },
  {
    name: "Test Program-3",
    device: "Device-1",
    size: "2.2KB",
  },
  {
    name: "Test Program-4",
    device: "Device-1",
    size: "2.2KB",
  },
  {
    name: "Test Program-5",
    device: "Device-1",
    size: "2.2KB",
  },
];

var generate_program_row_template = (programName, device) => `
<tr>
  <td>${programName}</td>
  <td>
  <div>
  <span class="deviceName">${device}</span>
    <div class="actionButtons">
    <button
    id="edit-${programName}"
        class="customButton customButton--primary editButton"
        onclick="onProgramEdit('${programName}')"
      >
        Edit
      </button>
      <button
    id="delete-${programName}"
        class="customButton customButton--primary deleteButton"
        onclick="onProgramDelete('${programName}')"
  
  
      >
        Delete
      </button>
    </div>
    </div>
  </td>
  </tr>`;

// var PROGRAMS_DATA = API_RESPONSE;
const loadProgramsData = (programsData) => {
  if (programsData.length > 0) {
    document.getElementById("noProgramsBanner").style.display = "none";
    document.getElementById("programsListContainer").style.display = "block";
    let programsListTableBody = document
      .getElementById("programsList")
      .getElementsByTagName("tbody")[0];
    programsListTableBody.innerHTML = "";
    programsData.forEach((programData) => {
      programsListTableBody.innerHTML += generate_program_row_template(
        programData.name,
        programData.device
      );
    });
  } else {
    document.getElementById("noProgramsBanner").style.display = "flex";
    document.getElementById("programsListContainer").style.display = "none";
  }
};

const onProgramEdit = (programName) => {
  programEditMode = true;
  console.log("Clicked Edit for program:", programName);
  getProgramDetails(programName).then((data) => {
    console.log("Program Details:", data);

    document
      .getElementById("addEditProgramPage")
      .getElementsByClassName("pageHeading")[0].innerText = "Edit Program";

    document.getElementById("device_name").value = data.deviceName;
    document.getElementById("device_id").value = data.deviceName;
    document.getElementById("auto_lock").value = data.autoLock;
    document.getElementById("autoLock").checked = data.autoLock;
    document.getElementById("auto_verify").value = data.autoVerify;
    document.getElementById("autoVerify").checked = data.autoVerify;

    document.getElementById("programName").value = data.programName;
    document.getElementById("programName").disabled = true;

    document.getElementById("lowBitsInput").value = data.lowFuse
      ? data.lowFuse.split("x")[1]
      : "";
    document.getElementById("highBitsInput").value =
      data.highFuse.split("x")[1] ?? "";
    document.getElementById("extendedBitsInput").value =
      data.extendedFuse.split("x")[1] ?? "";
    document.getElementById("lockBitsInput").value =
      data.lockBits.split("x")[1] ?? "";

    console.log(
      "Device Selected:::",
      `${data.deviceName}-${data.deviceId.toUpperCase()}`
    );
    const selectedDeviceValue = `${
      data.deviceName
    }-${data.deviceId.toUpperCase()}`;

    let allOptions = document
      .getElementById("deviceSelector")
      .getElementsByTagName("option");

    for (let index = 0; index < allOptions.length; index++) {
      if (allOptions[index].value === selectedDeviceValue) {
        allOptions[index].selected = true;
      }
    }
    document.getElementById("deviceSelector").disabled = true;
    onDeviceSelect(document.getElementById("deviceSelector"));
    document.getElementById("uploadContainer").style.display = "none";

    document.getElementById("programmedCountValue").innerText =
      data.programmedCount;
    document.getElementById("hexFileSizeValue").innerText = format_bytes(
      data.hexFileSize
    );

    const notations = document.getElementsByClassName("notation");
    for (let index = 0; index < notations.length; index++) {
      notations[index].style.display = "block";
    }
    navigateToAddProgramsPage();
  });
};
const onProgramDelete = (programName) => {
  console.log("Clicked Delete for program:", programName);
  deleteProgram(programName);
};

const updateMemoryUsageIndicators = (data) => {
  var usedMemory = format_bytes(data.occupiedSpace);
  var freeMemory = format_bytes(data.freeSpace);
  var totalMemory = format_bytes(data.totalSpace);
  let usedPercentage = parseInt((data.occupiedSpace / data.totalSpace) * 100);
  //   usedPercentage = usedPercentage.toPrecision(usedPercentage > 9 ? 4 : 3);

  console.log(
    "Memory details::::>> Used:",
    usedMemory,
    " Free:",
    freeMemory,
    " Total: ",
    totalMemory
  );
  document.querySelector(
    `#${activePage} #usedMemory`
  ).innerText = `Used: ${usedMemory} / ${totalMemory}`;

  let memoryLevel = document.querySelector(`#${activePage} #memoryLevel`);
  memoryLevel.style.width = `${usedPercentage}%`;

  document.querySelector(
    `#${activePage} #memoryPercentage`
  ).innerText = `${usedPercentage}%`;
  //   if(usedPercentage < 60)
  //   {
  //     // memoryLevel.classList.add('memoryLevel--stable')
  //   }
};

/////
// [
//   {
//       "name": "BLINK_A8_F4",
//       "device": "Atmega8A",
//       "count": 0
//   },
//   {
//       "name": "BLINK_A8_F5",
//       "device": "Atmega8A",
//       "count": 0
//   },
//   {
//       "name": "BLINK_A8_F6",
//       "device": "Atmega8A",
//       "count": 12
//   }
// ]

// {
//   "totalSpace": "1392640",
//   "occupiedSpace": "86016",
//   "freeSpace": "1306624",
//   "firmwareVersion": "0.0.1"
// }

const allDevices = [
  {
    name: "ATmega8",
    arch: 2,
    id: "0x1e9307",
    flashOffset: "0x0",
    flash: 8192,
    boot: 256,
    eeprom: 512,
    sram: 1024,
    fuseBytes: 2,
    lockBytes: 1,
  },
  {
    name: "ATmega8A",
    arch: 2,
    id: "0x1e9307",
    flashOffset: "0x0",
    flash: 8192,
    boot: 256,
    eeprom: 512,
    sram: 1024,
    fuseBytes: 2,
    lockBytes: 1,
  },
  {
    name: "ATmega328",
    arch: 2,
    id: "0x1e9514",
    flashOffset: "0x0",
    flash: 32768,
    boot: 512,
    eeprom: 1024,
    sram: 2048,
    fuseBytes: 3,
    lockBytes: 1,
  },
  {
    name: "ATmega328P",
    arch: 2,
    id: "0x1e950f",
    flashOffset: "0x0",
    flash: 32768,
    boot: 512,
    eeprom: 1024,
    sram: 2048,
    fuseBytes: 3,
    lockBytes: 1,
  },
  {
    name: "ATmega328PB",
    arch: 2,
    id: "0x1e9516",
    flashOffset: "0x0",
    flash: 32768,
    boot: 512,
    eeprom: 1024,
    sram: 2048,
    fuseBytes: 3,
    lockBytes: 1,
  },
  {
    name: "ATmega16",
    arch: 2,
    id: "0x1e9403",
    flashOffset: "0x0",
    flash: 16384,
    boot: 256,
    eeprom: 512,
    sram: 1024,
    fuseBytes: 2,
    lockBytes: 1,
  },
  {
    name: "ATmega16A",
    arch: 2,
    id: "0x1e9403",
    flashOffset: "0x0",
    flash: 16384,
    boot: 256,
    eeprom: 512,
    sram: 1024,
    fuseBytes: 2,
    lockBytes: 1,
  },
  {
    name: "ATmega32",
    arch: 2,
    id: "0x1e9502",
    flashOffset: "0x0",
    flash: 32768,
    boot: 512,
    eeprom: 1024,
    sram: 2048,
    fuseBytes: 2,
    lockBytes: 1,
  },
  {
    name: "ATmega32A",
    arch: 2,
    id: "0x1e9502",
    flashOffset: "0x0",
    flash: 32768,
    boot: 512,
    eeprom: 1024,
    sram: 2048,
    fuseBytes: 2,
    lockBytes: 1,
  },
  {
    name: "ATmega2560",
    arch: 2,
    id: "0x1e9801",
    flashOffset: "0x0",
    flash: 262144,
    boot: 1024,
    eeprom: 4096,
    sram: 8192,
    fuseBytes: 3,
    lockBytes: 1,
  },
];
