import fs from "fs";

import { json } from "stream/consumers";

// import * as _ from "lodash";

/**
 * fetch the json from the url
 *
 * @async
 * @param {string} url the url string from the builder
 * @returns {json}
 */
export async function fetchURL(url) {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} - ${res.statusText}`);
  }

  let awaitedResponse = await res.json(); // or .txt, depends on all that kinda stuff, but .json here
  let properObject = { data: awaitedResponse };

  return properObject;
}

/**
 * save data to a filepath
 *
 * @param {{ filePath: string; data: string; json: boolean; }}
 * @param {*} filePath filepath to save to i.e. "./test.json"
 * @param {*} data data to save
 * @param {boolean} [json=true] if true will stringify, default true
 */
export function saveDataToFile({ filePath, data, json = true }) {
  if (json === true) {
    fs.writeFileSync(filePath, JSON.stringify(data));
  } else {
    fs.writeFileSync(filePath, data);
  }
}

/**
 * read data from path such as arrays or objects, etc, back to js types
 *
 * @export
 * @param {string} filePath
 * @returns {{}}
 */
export function readDataFromFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

/**
 * gets the form urls for each runner so as to download the forms as well
 *
 * @param {string} filePathString
 * @returns {[]}
 */
export function getFormURLsFromJsonFile(filePathString) {
  let dataFile = fs.readFileSync(filePathString, "utf-8");
  let data = JSON.parse(dataFile);
  let runnersArray = data.data.runners;
  let runnersFormURLsArray = [];

  for (let i = 0; i < runnersArray.length; i++) {
    let scratchedPotential = i + 1;
    try {
      let getting = runnersArray[i]._links.form;
      runnersFormURLsArray.push(getting);
    } catch {
      console.log(
        "unable for runner " + scratchedPotential + ", must be scratched",
      );
    }
  }
  return runnersFormURLsArray;
}

/**
 * gets the formURL of the runners in an array and saves it to a file.
 *
 * @export
 * @param {{ filePath: string; destinationFilePath: string; }}
 * @param {string} filePath
 * @param {string} destinationFilePath
 */
export function getFormURLsFromJsonFileAndSaveToFile({
  filePath,
  destinationFilePath,
}) {
  let x = getFormURLsFromJsonFile(filePath);
  saveDataToFile({ filePath: destinationFilePath, data: x });
}

/**
 * gets the form urls from json
 *
 * @export
 * @async
 * @param {{}} data json data
 * @returns {[string]}
 */
export async function getFormURLs(data) {
  let runnersArray = data.data.runners;
  let runnersFormURLsArray = [];

  for (let i = 0; i < runnersArray.length; i++) {
    let scratchedPotential = i + 1;
    try {
      let getting = runnersArray[i]["_links"]["form"];
      runnersFormURLsArray.push(getting);
    } catch {
      console.log(
        "unable for runner " + scratchedPotential + ", must be scratched",
      );
    }
  }
  return runnersFormURLsArray;
}

/**
 * fetchs the form data from a url to racedata
 *
 * @async
 * @param {{ url: string; filePath: string; }}
 * @param {string} url
 * @param {string} filePath
 * @returns {{}}
 */
async function fetchFormDataOfRunningDogs({ url, filePath }) {
  const raceData = await fetchURL(url);
  console.log(raceData);
  let formDataURLS = await getFormURLs(raceData);
  let fetchedFormData = [];

  for (let i = 0; i < formDataURLS.length; i++) {
    const data = await fetchURL(formDataURLS[i]);
    fetchedFormData.push(data);
    console.log(data);
  }
  saveDataToFile({ filePath: filePath, data: fetchedFormData });
}

/**
 * filter json meeting data by either the meetingName or venueMnemonic
 *
 * @export
 * @param {{ filePath: string; venueName: string; venueMnemonic: string; }}
 * @param {string} filePath i.e. "./test.json"
 * @param {string} venueName "SALE", "MANDURAH", "THE-GARDENS", etc
 * @param {string} venueMnemonic "GDH", "HEA", "TRE", etc
 * @returns {{}}
 */
export function filterMeetingByVenueNameOrMnemonic({
  filePath,
  venueName,
  venueMnemonic,
}) {
  let data = readDataFromFile(filePath);
  if (!venueMnemonic && !venueName) {
    return [];
  }
  if (venueName) {
    return data?.data?.meetings.filter(
      (meeting) => meeting.meetingName === venueName,
    );
  } else if (venueMnemonic) {
    return data?.data?.meetings.filter(
      (meeting) => meeting.venueMnemonic === venueMnemonic,
    );
  }
}

/**
 * fetchs the json of all races in a meeting from the meeting data file
 *
 * @export
 * @async
 * @param {{ filePath: string; venueName: string; venueMnemonic: string; }}
 * @param {string} filePath filepath to the meeting data file
 * @param {string} venueName "SALE", "MANDURAH", "THE-GARDENS", etc
 * @param {string} venueMnemonic "GDH", "HEA", "TRE", etc
 * @returns {{}}
 */
export async function fetchRacesOfAMeetingByVenueNameOrMnemonic({
  filePath,
  venueName,
  venueMnemonic,
}) {
  if (!venueName && !venueMnemonic) {
    return "NO VENUE NAME OR MNEMONIC MATCH";
  }
  if (venueMnemonic) {
    let data = filterMeetingByVenueNameOrMnemonic({
      filePath: filePath,
      venueMnemonic: venueMnemonic,
    })[0]; // gets first indices of array before going into object such as below; its the only indices, idk why they didnt just make it a string, probably an accident that doesnt need fixing
    console.log(data);
    return await fetchURL(data._links.races);
  } else if (venueName) {
    let data = filterMeetingByVenueNameOrMnemonic({
      filePath: filePath,
      venueName: venueName,
    })[0]; // gets first indices of array before going into object such as below; its the only indices, idk why they didnt just make it a string, probably an accident that doesnt need fixing
    console.log(data);
    return await fetchURL(data._links.races);
  }
}

/**
 * returns all meetings exluding those in the arrayOfExclusionStrings i.e. ["NSW","SA","NZL"] etc
 *
 * @export
 * @async
 * @param {{ filePath?: string; meetingData?: object; arrayOfExclusionStrings?: [string]; raceType?: string; namesOnly?: boolean; }}
 * @param {string} filePath
 * @param {{}} meetingData if meeting data is already read into a var, then exclude filePath and use the data in the variable
 * @param {{}} [arrayOfExclusionStrings=[]] i.e. ["NSW","SA","NZL"] etc
 * @param {string} [raceType="G"] "G", "H", "R"
 * @param {boolean} [namesOnly=true] true by default, false for array of objects with all data
 * @returns {*} stringArray or object
 */
export async function filterMeetingByExludingJurisdictions({
  filePath,
  meetingData,
  arrayOfExclusionStrings = [],
  raceType = "G",
  namesOnly = true,
}) {
  let meetings = [];
  let returnValues = [];
  let data =
    filePath && !meetingData ? await readDataFromFile(filePath) : meetingData;
  let meetAddr = data.data.meetings;

  for (let i = 0; i < meetAddr.length; i++) {
    if (meetAddr[i].raceType === raceType) {
      meetings.push(meetAddr[i]);
    }
  }

  for (let i = 0; i < meetings.length; i++) {
    let excludeByLocation = arrayOfExclusionStrings;

    if (!excludeByLocation.includes(meetings[i].location))
      if (namesOnly) {
        returnValues.push(meetings[i].meetingName);
      } else {
        returnValues.push(meetings[i]);
      }
  }
  return await returnValues;
}

/**
 * get the json file containing the days meetings
 *
 * @export
 * @async
 * @param {string} date yyyy-mm-dd i.e. 2026-04-23
 * @returns {JSON}
 */
export async function fetchDailyMeetings(date) {
  let data = await fetchURL(
    `https://api.beta.tab.com.au/v1/tab-info-service/racing/dates/${date}/meetings?jurisdiction=NSW&returnOffers=true&returnPromo=false`,
  );
  return await data;
}

/**
 * fetch and save the meetings of the input date
 *
 * @export
 * @async
 * @param {{ date: string; filePath: string; }}
 * @param {string} date
 * @param {string} filePath
 */
export async function fetchAndSaveDailyMeetings({ date, filePath }) {
  let data = await fetchDailyMeetings(date);
  saveDataToFile({ filePath: filePath, data: data });
}

/**
 * returns an object with strings built for meeting, race, form, and resultedMeeting file names, ensures consistency
 *
 * @export
 * @param {{ date: string; venueName: string; raceNumber: int; fileExtension:string;}} 
 * @param {string} date meeting/race date
 * @param {string} venueName 
 * @param {number} raceNumber 
 * @param {string="json"} fileExtension "json" by default
 * @returns {{ meetings: string; races: string; form: string; resultedMeetings: string;}} 
 * @example 
 * // will return something like:
 * 
 * {
    meetings:`2026-04-04-TAREE-meetings.json`,
    race: `2026-04-04-TAREE-race-1.json`,
    form:`2026-04-04-TAREE-race-1-form.json`,
    resultedMeetings:`2026-04-04-TAREE-meetings-RESULTED.json`,
  }

  // to be accessed like:

  let x = fileNameBuilderObject({date:"2026-04-04", venueName:"TAREE", raceNumber:1}); // in a for loop can increment raceNumber param as i and will coerce int to string
  let y = x.race // === `2026-04-04-TAREE-race-1.json`
 */
export function fileNameBuilderObject({
  date,
  venueName,
  raceNumber = 1,
  fileExtension = "json",
}) {
  return {
    meetings: `${date}-${venueName}-meetings.${fileExtension}`,
    race: `${date}-${venueName}-race-${raceNumber}.${fileExtension}`,
    form: `${date}-${venueName}-race-${raceNumber}-form.${fileExtension}`,
    resultedMeetings: `${date}-${venueName}-meetings-RESULTED.${fileExtension}`,
  };
}

/**
 * returns an object with strings built for meeting, race, form, and resultedMeeting path names including filenames built, ensures consistency
 *
 * @export
 * @param {{ pathStart?: string; raceType?: string; venueName: string; date: string; fileNameObject?: {}; }}
 * @param {string} [pathStart="./data"] this is the start of the path strings, currently "./data", but made a param in case i need to "../../etc"
 * @param {{}} [fileNameObject={}] returned fileNameObject from the function
 * @param {string} [raceType="G"] G/R/H
 * @param {string} venueName
 * @param {string} date yyyy-mm-dd
 * @returns {{ meetingsPath: string; racePath: string; formPath: string; resultedMeetingsPath: string; }}
 * @example
 * let x = filenameBuilderObject({date:date:"2026-04-05", venueName:"MANDURAH", raceNumber:1, fileExtension:"json"});
 *
 * let y = pathBuilderObject({pathStart:"./data",raceType:"G",venueName:"MANDURAH", date:"2026-04-05", fileNameObject:x});
 *
 * // returns something like:
 *
 * {
 *    meetingsPath: "./data/G/MANDURAH/2026-04-05/2026-04-05-MANDURAH-meetings.json",
 *    racePath: "./data/G/MANDURAH/2026-04-05/2026-04-05-MANDURAH-race-1.json",
 *    formPath: "./data/G/MANDURAH/2026-04-05/2026-04-05-MANDURAH-race-1-form.json",
 *    resultedMeetingsPath: "./data/G/MANDURAH/2026-04-05/2026-04-05-MANDURAH-meetings-RESULTED.json"
 * }
 */
export function pathBuilderObject({
  pathStart = "./data",
  raceType = "G",
  venueName,
  date,
  fileNameObject = {},
}) {
  let initialPathStart = `${pathStart}/${raceType}/${venueName}/${date}`;
  return {
    meetingsPath: `${initialPathStart}/${fileNameObject.meetings}`,
    racePath: `${initialPathStart}/${fileNameObject.race}`,
    formPath: `${initialPathStart}/${fileNameObject.form}`,
    resultedMeetingsPath: `${initialPathStart}/${fileNameObject.resultedMeetings}`,
  };
}

/**
 * returns the object with path and filenames, essentially facading filenameBuilderObject and pathBuilderObject to create paths to files for saving/loading json data and probably csv data later when i start breaking this data down and feature engineering for the model.
 *
 * @export
 * @param {{ date: any; venueName: any; raceNumber?: number; fileExtension?: string; pathStart?: string; raceType?: string; }}
 * @param {string} date yyyy-mm-dd
 * @param {string} venueName
 * @param {number} [raceNumber=1]
 * @param {string} [fileExtension="json"] "json" by default
 * @param {string} [pathStart="./data"] this is the start of the path strings, currently "./data", but made a param in case i need to "../../etc"
 * @param {string} [raceType="G"] G/H/R
 * @example
 *
 * let x = pathsWithFilenamesBuilderObject({date:"2026-04-05", venueName:"MANDURAH", raceNumber:1, fileExtension:"json", pathStart:"./data", raceType:"G"});
 * // returns something like:
 *
 * {
 *    meetingsPath: "./data/G/MANDURAH/2026-04-05/2026-04-05-MANDURAH-meetings.json",
 *    racePath: "./data/G/MANDURAH/2026-04-05/2026-04-05-MANDURAH-race-1.json",
 *    formPath: "./data/G/MANDURAH/2026-04-05/2026-04-05-MANDURAH-race-1-form.json",
 *    resultedMeetingsPath: "./data/G/MANDURAH/2026-04-05/2026-04-05-MANDURAH-meetings-RESULTED.json"
 * }
 * @returns {{ meetingsPath: string; racePath: string; formPath: string; resultedMeetingsPath: string; }}
 */
export function pathsWithFilenamesBuilderObject({
  date,
  venueName,
  raceNumber = 1,
  fileExtension = "json",
  pathStart = "./data",
  raceType = "G",
}) {
  let x = fileNameBuilderObject({
    date: date,
    venueName: venueName,
    raceNumber: raceNumber,
    fileExtension: fileExtension,
  });

  return pathBuilderObject({
    pathStart: pathStart,
    raceType: raceType,
    venueName: venueName,
    date: date,
    fileNameObject: x,
  });
}

/**
 * input a path and the parent dirs will be ensured, and also returns the path string to be used as a filepath or dirpath etc
 *
 * @export
 * @param {string} path i.e. "./this/directory/and/this/subdirectory/are/all/ensured/to/be/created/BUT_NO_FILES
 * @returns {string}
 */
export function dirString(path) {
  fs.mkdirSync(path, { recursive: true });
  return path;
}

async function test({
  destinationDirectory = "./data",
  loadDirectory,
  date,
  downloadDailyMeeting = true,
}) {
  /*
  ! this is a test, will be working on this more and seeing what does and doesnt need to be done/removed
  */
  downloadDailyMeeting
    ? await fetchAndSaveDailyMeetings({
        date: date,
        filePath: dirString(`${destinationDirectory}`) + `/${date}.json`,
      })
    : console.log("presumably downloaded");
  let dailyMeetings = readDataFromFile(
    `${loadDirectory ? loadDirectory : destinationDirectory}/${date}.json`,
  );
  let dailyGreyhounds = await filterMeetingByExludingJurisdictions({
    meetingData: dailyMeetings,
    raceType: "G",
    arrayOfExclusionStrings: ["GBR"],
    namesOnly: false,
  });
  let dailyHarness = await filterMeetingByExludingJurisdictions({
    meetingData: dailyMeetings,
    raceType: "H",
    arrayOfExclusionStrings:["CAN"],
    namesOnly: false,
  });
  let dailyHorses = await filterMeetingByExludingJurisdictions({
    meetingData: dailyMeetings,
    raceType: "R",
    arrayOfExclusionStrings:["IRL", "USA", "ARG", "GBR", "TUR"],
    namesOnly: false,
  });
  saveDataToFile({
    filePath: dirString(`${destinationDirectory}`) + `/${date}-G-meetings.json`,
    data: dailyGreyhounds,
  });
  saveDataToFile({
    filePath: dirString(`${destinationDirectory}`) + `/${date}-H-meetings.json`,
    data: dailyHarness,
  });
  saveDataToFile({
    filePath: dirString(`${destinationDirectory}`) + `/${date}-R-meetings.json`,
    data: dailyHorses,
  });

  //! get race urls from each venue meeting
  let greyhoundMeetingsArray = [];
  for (let i = 0; i < dailyGreyhounds.length; i++) {
    greyhoundMeetingsArray.push({
      venueName: dailyGreyhounds[i].meetingName.replace(" ", "_"),
      raceLink: dailyGreyhounds[i]._links.races,
    });
  }
  console.log(greyhoundMeetingsArray);

  //! save each venues race data in individual files
  let raceArray = [];
  for (let i = 0; i < greyhoundMeetingsArray.length; i++) {
    let x = await fetchURL(greyhoundMeetingsArray[i].raceLink);
    raceArray.push({
      venueName: greyhoundMeetingsArray[i].venueName,
      races: await x,
    });
  }

  console.log(raceArray);

  //! save race data from daily meetings as a monolithic file
  saveDataToFile({
    filePath:
      dirString(`${destinationDirectory}/G`) +
      `/${date}-all-meetings-race-DATA.json`,
    data: raceArray,
  });

  for (let i = 0; i < raceArray.length; i++) {
    saveDataToFile({
      filePath:
        dirString(`${destinationDirectory}/G`) +
        `/${date}-${raceArray[i].venueName}-race-DATA.json`,
      data: raceArray[i].races,
    });
  }

  //! get form data for each race
  let formArray = [];
  for (let i = 0; i < raceArray.length; i++) {
    for (let j = 0; j < raceArray[i].races.data.races.length; j++) {
      let x = await fetchURL(raceArray[i].races.data.races[j]._links.form);
      formArray.push({
        venueName: raceArray[i].venueName,
        raceNumber: j + 1,
        form: x.data.form,
      });
    }
  }

  saveDataToFile({
    filePath:
      dirString(`${destinationDirectory}/G`) +
      `/${date}-all-meetings-races-form-DATA.json`,
    data: formArray,
  });

  for (let i = 0; i < formArray.length; i++) {
    saveDataToFile({
      filePath:
        dirString(`${destinationDirectory}/G/${formArray[i].venueName}`) +
        `/${date}-${formArray[i].venueName}-race-${formArray[i].raceNumber}-form-DATA.json`,
      data: formArray[i],
    });
  }

  console.log(formArray);
  //! ////////////////////////////////////////////////////////////////

  //! get race urls from each venue meeting
  let harnessMeetingsArray = [];
  for (let i = 0; i < dailyHarness.length; i++) {
    harnessMeetingsArray.push({
      venueName: dailyHarness[i].meetingName.replace(" ", "_"),
      raceLink: dailyHarness[i]._links.races,
    });
  }
  console.log(harnessMeetingsArray);

  //! save each venues race data in individual files
  let harnessRaceArray = [];
  for (let i = 0; i < harnessMeetingsArray.length; i++) {
    let x = await fetchURL(harnessMeetingsArray[i].raceLink);
    harnessRaceArray.push({
      venueName: harnessMeetingsArray[i].venueName,
      races: await x,
    });
  }

  console.log(harnessRaceArray);

  //! save race data from daily meetings as a monolithic file
  saveDataToFile({
    filePath:
      dirString(`${destinationDirectory}/H`) +
      `/${date}-all-meetings-race-DATA.json`,
    data: raceArray,
  });

  for (let i = 0; i < harnessRaceArray.length; i++) {
    saveDataToFile({
      filePath:
        dirString(`${destinationDirectory}/H`) +
        `/${date}-${harnessRaceArray[i].venueName}-race-DATA.json`,
      data: harnessRaceArray[i].races,
    });
  }

  //! get form data for each race
  let harnessFormArray = [];
  for (let i = 0; i < harnessRaceArray.length; i++) {
    for (let j = 0; j < harnessRaceArray[i].races.data.races.length; j++) {
      let x = await fetchURL(harnessRaceArray[i].races.data.races[j]._links.form);
      harnessFormArray.push({
        venueName: harnessRaceArray[i].venueName,
        raceNumber: j + 1,
        form: x.data.form,
      });
    }
  }

  saveDataToFile({
    filePath:
      dirString(`${destinationDirectory}/H`) +
      `/${date}-all-meetings-races-form-DATA.json`,
    data: formArray,
  });

  for (let i = 0; i < harnessFormArray.length; i++) {
    saveDataToFile({
      filePath:
        dirString(`${destinationDirectory}/H/${harnessFormArray[i].venueName}`) +
        `/${date}-${harnessFormArray[i].venueName}-race-${harnessFormArray[i].raceNumber}-form-DATA.json`,
      data: harnessFormArray[i],
    });
  }

  console.log(harnessFormArray);

  //! //////////////////////////////////////////

  //! get race urls from each venue meeting
  let horsesMeetingsArray = [];
  for (let i = 0; i < dailyHorses.length; i++) {
    horsesMeetingsArray.push({
      venueName: dailyHorses[i].meetingName.replace(" ", "_"),
      raceLink: dailyHorses[i]._links.races,
    });
  }
  console.log(horsesMeetingsArray);

  //! save each venues race data in individual files
  let horseRaceArray = [];
  for (let i = 0; i < horsesMeetingsArray.length; i++) {
    let x = await fetchURL(horsesMeetingsArray[i].raceLink);
    horseRaceArray.push({
      venueName: horsesMeetingsArray[i].venueName,
      races: await x,
    });
  }

  console.log(horseRaceArray);

  //! save race data from daily meetings as a monolithic file
  saveDataToFile({
    filePath:
      dirString(`${destinationDirectory}/R`) +
      `/${date}-all-meetings-race-DATA.json`,
    data: horseRaceArray,
  });

  for (let i = 0; i < horseRaceArray.length; i++) {
    saveDataToFile({
      filePath:
        dirString(`${destinationDirectory}/H`) +
        `/${date}-${horseRaceArray[i].venueName}-race-DATA.json`,
      data: horseRaceArray[i].races,
    });
  }

  //! get form data for each race
  let horseFormArray = [];
  for (let i = 0; i < horseRaceArray.length; i++) {
    for (let j = 0; j < horseRaceArray[i].races.data.races.length; j++) {
      let x = await fetchURL(horseRaceArray[i].races.data.races[j]._links.form);
      horseFormArray.push({
        venueName: horseRaceArray[i].venueName,
        raceNumber: j + 1,
        form: x.data.form,
      });
    }
  }

  saveDataToFile({
    filePath:
      dirString(`${destinationDirectory}/R`) +
      `/${date}-all-meetings-races-form-DATA.json`,
    data: horseFormArray,
  });

  for (let i = 0; i < horseFormArray.length; i++) {
    saveDataToFile({
      filePath:
        dirString(`${destinationDirectory}/R/${horseFormArray[i].venueName}`) +
        `/${date}-${horseFormArray[i].venueName}-race-${horseFormArray[i].raceNumber}-form-DATA.json`,
      data: horseFormArray[i],
    });
  }

  console.log(horseFormArray);

  //! get form data for each race
  //! save those
}

test({
  destinationDirectory: "./data",
  date: "2026-04-06",
  download: true,
});
