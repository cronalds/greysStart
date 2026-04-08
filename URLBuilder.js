import fs from "fs";

import { json } from "stream/consumers";

import path from "path";

const timeHHMMSS = new Date().toTimeString().slice(0, 8).replace(/:/g, '-');

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
 * @returns {array} stringArray or object
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

async function capture({dailyMeeting=[], raceType="", date, destinationDirectory, alreadyCapturedVenues}){
  let meetings = [];
      for (let i = 0; i < dailyMeeting.length; i++) {
        try {
          meetings.push({
            venueName: dailyMeeting[i].meetingName.replace(" ", "_"),
            raceLink: dailyMeeting[i]._links.races,
          });
          alreadyCapturedVenues.push(
            dailyMeeting[i].meetingName.replace(" ", "_"),
          );
        } catch {}
      }
      console.log(meetings);

      //! populate array with all meetings
      let races = [];
      for (let i = 0; i < meetings.length; i++) {
        let x = await fetchURL(meetings[i].raceLink);
        races.push({
          venueName: meetings[i].venueName,
          races: await x,
        });
      }

      console.log(races);

      //! save race data from daily meetings as a monolithic file
      saveDataToFile({
        filePath:
          dirString(`${destinationDirectory}/H`) +
          `/${date}-${timeHHMMSS}-all-meetings-race-DATA.json`,
        data: races,
      });

      for (let i = 0; i < races.length; i++) {
        saveDataToFile({
          filePath:
            dirString(`${destinationDirectory}/${raceType}`) +
            `/${date}-${races[i].venueName}-race-DATA.json`,
          data: races[i].races,
        });
      }

      //! get runner form data for each race in an array
      let form = [];
      for (let i = 0; i < races.length; i++) {
        for (let j = 0; j < races[i].races.data.races.length; j++) {
          let x = await fetchURL(
            races[i].races.data.races[j]._links.form,
          );
          form.push({
            venueName: races[i].venueName,
            raceNumber: races[i].races.data.races[j].raceNumber,
            form: x.data.form,
          });
        }
      }

      //! save runner form for each race at all meetings in a single monolithic file
      saveDataToFile({
        filePath:
          dirString(`${destinationDirectory}/${raceType}`) +
          `/${date}-${timeHHMMSS}-all-meetings-races-form-DATA.json`,
        data: form,
      });

      //! get form for runners in each race and save to individual race files
      for (let i = 0; i < form.length; i++) {
        saveDataToFile({
          filePath:
            dirString(
              `${destinationDirectory}/${raceType}/${form[i].venueName}`,
            ) +
            `/${date}-${form[i].venueName}-race-${form[i].raceNumber}-form-DATA.json`,
          data: form[i],
        });
      }
      console.log(form);
    }

async function test({
  destinationDirectory = "./data",
  loadDirectory,
  date,
  downloadDailyMeeting = true,
  resulted = false,
  greyhounds = true,
  harness = true,
  horses = true,
  greyhoundsExcludedLocationsArray,
  harnessExcludedLocationsArray,
  horsesExcludedLocationsArray,
}) {
  /*
  ! this is a test, will be working on this more and seeing what does and doesnt need to be done/removed
  */

  let alreadyCapturedVenues = [];

  try {
    alreadyCapturedVenues = readDataFromFile(
      `./data/${date}/${date}-captured-venues.json`,
    );
  } catch {}

  let newDir = dirString(destinationDirectory + `/${date}`);

  destinationDirectory = newDir;

  if (!resulted) {
    downloadDailyMeeting
      ? await fetchAndSaveDailyMeetings({
          date: date,
          filePath: dirString(destinationDirectory) + `/${date}.json`,
        })
      : console.log("presumably downloaded");
    let dailyMeetings = readDataFromFile(
      `${loadDirectory ? loadDirectory : destinationDirectory}/${date}.json`,
    );

    dailyMeetings = {
      data: {
        meetings: dailyMeetings.data.meetings.filter(
          (meeting) => !alreadyCapturedVenues.includes(meeting.meetingName.replace(" ", "_")),
        ),
      },
    };

    let dailyGreyhounds = await filterMeetingByExludingJurisdictions({
      meetingData: dailyMeetings,
      raceType: "G",
      arrayOfExclusionStrings: greyhoundsExcludedLocationsArray,
      namesOnly: false,
    });

    let dailyHarness = await filterMeetingByExludingJurisdictions({
      meetingData: dailyMeetings,
      raceType: "H",
      arrayOfExclusionStrings: harnessExcludedLocationsArray,
      namesOnly: false,
    });

    let dailyHorses = await filterMeetingByExludingJurisdictions({
      meetingData: dailyMeetings,
      raceType: "R",
      arrayOfExclusionStrings: horsesExcludedLocationsArray,
      namesOnly: false,
    });

    if (greyhounds) {
      saveDataToFile({
        filePath:
          dirString(`${destinationDirectory}`) + `/${date}-${timeHHMMSS}-G-meetings.json`,
        data: dailyGreyhounds,
      });
    }

    if (harness) {
      saveDataToFile({
        filePath:
          dirString(`${destinationDirectory}`) + `/${date}-${timeHHMMSS}-H-meetings.json`,
        data: dailyHarness,
      });
    }

    if (horses) {
      saveDataToFile({
        filePath:
          dirString(`${destinationDirectory}`) + `/${date}-${timeHHMMSS}-R-meetings.json`,
        data: dailyHorses,
      });
    }

    if (greyhounds) {
      await capture({dailyMeeting:dailyGreyhounds, raceType:"G",date:date, destinationDirectory:destinationDirectory, alreadyCapturedVenues:alreadyCapturedVenues});
    }

    if (harness) {
      await capture({dailyMeeting:dailyHarness, raceType:"H",date:date, destinationDirectory:destinationDirectory, alreadyCapturedVenues:alreadyCapturedVenues});
    }

    if (horses) {
      await capture({dailyMeeting:dailyHorses, raceType:"R",date:date, destinationDirectory:destinationDirectory, alreadyCapturedVenues:alreadyCapturedVenues});
    }
    saveDataToFile({
      filePath: `./data/${date}/${date}-captured-venues.json`,
      data: alreadyCapturedVenues,
    });
  }

  //! if resulted=true
  else {
    await fetchAndSaveDailyMeetings({
      date: date,
      filePath: dirString(`${destinationDirectory}`) + `/${date}-RESULTS.json`,
    });
  }
}

async function getAllFiles({
  dir,
  excludeSubstrings = [],
  mustIncludeSubstrings = [],
}) {
  const stack = [dir];
  const results = [];

  const exclude = excludeSubstrings.map((s) => s);
  const include = mustIncludeSubstrings.map((s) => s);

  while (stack.length) {
    const current = stack.pop();
    const entries = await fs.promises.readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);

      if (exclude.some((sub) => fullPath.includes(sub))) {
        continue;
      }

      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (
        include.length > 0 &&
        !include.some((sub) => fullPath.includes(sub))
      ) {
        continue;
      }
      results.push(fullPath);
    }
  }
  for (let i = 0; i < results.length; i++) {
    results[i] = results[i].replace(/\\/g, "/"); // replaces all occurrences of "\\"
  }
  return results;
}

/**
 * same as get all files except returns all race form files as an object with greys, harness, and horses properties to access for the arrays.
 *
 * @async
 * @param {{ dir: any; excludeSubstrings?: {}; mustIncludeSubstrings?: {}; }}
 * @param {*} dir
 * @param {{}} [excludeSubstrings=[]]
 * @param {{}} [mustIncludeSubstrings=[]]
 * @returns {unknown}
 */
async function getAllRaceFiles({
  dir,
  excludeSubstrings = ["race-DATA", "all-meetings", "meetings", "racePaths"],
  mustIncludeSubstrings = ["race"],
}) {
  const stack = [dir];
  const results = [];

  const exclude = excludeSubstrings.map((s) => s);
  const include = mustIncludeSubstrings.map((s) => s);

  while (stack.length) {
    const current = stack.pop();
    const entries = await fs.promises.readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);

      if (exclude.some((sub) => fullPath.includes(sub))) {
        continue;
      }

      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (
        include.length > 0 &&
        !include.some((sub) => fullPath.includes(sub))
      ) {
        continue;
      }

      results.push(fullPath);
    }
  }
  for (let i = 0; i < results.length; i++) {
    results[i] = results[i].replace(/\\/g, "/"); // replaces all occurrences of "\\"
  }
  let greys = [];
  let harness = [];
  let horses = [];

  for (let str of results) {
    if (str.includes("/G/")) {
      greys.push(str);
    } else if (str.includes("/H/")) {
      harness.push(str);
    } else if (str.includes("/R/")) {
      horses.push(str);
    }
  }
  greys.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  harness.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  horses.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  return { greys, harness, horses };
}

test({
  destinationDirectory: "./data",
  date: "2026-04-08",
  download: true,
  resulted: false,
  greyhounds: false,
  harness: true,
  horses: false,
  //greyhoundsExcludedLocationsArray: ["GBR"],
  //harnessExcludedLocationsArray: ["CAN"],
  //horsesExcludedLocationsArray: ["IRL", "USA", "ARG", "GBR", "TUR"],
});

/*
let races = await getAllRaceFiles({
  dir: "./data",
});
saveDataToFile({ filePath: dirString("./data/test") + "/racePaths.json", data: races });
*/

// when i upload this to aws to automate, when it runs every 5 mins i may redownload the meetings each time and update what races to download; tralee in irl for G wasnt listed earlier or id have it, the irish dogs seem to have good form info too; ill have to think more about this stuff

// probably an array of already captured venues stored as a file and exclude those from download when redownloading, should be pretty simple, if str in array then dont download else do
