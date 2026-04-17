import fs from "fs";

import { json } from "stream/consumers";

import path from "path";

import dayjs from "dayjs";
import { pipeline } from "stream/promises";
// import * as _ from "lodash";

const timeHHMMSS = new Date().toTimeString().slice(0, 8).replace(/:/g, "-");
let dayBefore = (date) => dayjs(date).subtract(1, "day").format("YYYY-MM-DD");

/**
 * fetch the json from the url
 *
 * @async
 * @param {string} url the url string from the builder
 * @returns {json}
 */
async function fetchURL(url) {
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
function saveDataToFile({ filePath, data, json = true }) {
  if (json === true) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
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
function readDataFromFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

async function fetchResultsByDate({ date }) {
  let x = await fetchURL(
    `https://api.beta.tab.com.au/v1/historical-results-service/NSW/racing/${date}`,
  );
  console.log(x);
  return x;
}

/**
 * returns all meetings exluding those in the arrayOfExclusionStrings i.e. ["NSW","SA","NZL"] etc
 *
 * @export
 * @async
 * @param {{ filePath?: string; meetingData?: object; arrayOfExclusionStrings?: [string]; arrayOfVenueNameExclusionStrings: [string]; raceType?: string; namesOnly?: boolean; }}
 * @param {string} filePath
 * @param {{}} meetingData if meeting data is already read into a var, then exclude filePath and use the data in the variable
 * @param {{}} [arrayOfExclusionStrings=[]] i.e. ["NSW","SA","NZL"] etc
 * @param {string} [raceType="G"] "G", "H", "R"
 * @param {boolean} [namesOnly=true] true by default, false for array of objects with all data
 * @returns {array} stringArray or object
 */
async function filterMeetingByExludingJurisdictions({
  filePath,
  meetingData,
  arrayOfExclusionStrings = [],
  arrayOfVenueNameExclusionStrings = [],
  raceType = "G",
  namesOnly = true,
}) {
  let data =
    filePath && !meetingData ? await readDataFromFile(filePath) : meetingData;

  let meetings = data.data.meetings;

  let filtered = [];

  for (let i = 0; i < meetings.length; i++) {
    let meeting = meetings[i];

    // Filter by race type first
    if (meeting.raceType !== raceType) continue;

    // Exclusion checks (COMBINED)
    let excludeByLocation = arrayOfExclusionStrings.includes(meeting.location);
    let excludeByName = arrayOfVenueNameExclusionStrings.includes(
      meeting.meetingName,
    );

    if (excludeByLocation || excludeByName) continue;

    // Push result
    filtered.push(namesOnly ? meeting.meetingName : meeting);
  }

  return filtered;
}

/**
 * get the json file containing the days meetings
 *
 * @export
 * @async
 * @param {string} date yyyy-mm-dd i.e. 2026-04-23
 * @returns {JSON}
 */
async function fetchDailyMeetings(date) {
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
async function fetchAndSaveDailyMeetings({ date, filePath }) {
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
function dirString(path) {
  fs.mkdirSync(path, { recursive: true });
  return path;
}

async function capture({
  dailyMeeting = [],
  raceType = "",
  date,
  destinationDirectory,
  alreadyCapturedVenues,
}) {
  let meetings = [];
  for (let i = 0; i < dailyMeeting.length; i++) {
    try {
      meetings.push({
        venueName: dailyMeeting[i].meetingName.replace(/ /g, "_"),
        raceLink: dailyMeeting[i]._links.races,
      });
      alreadyCapturedVenues.push(
        dailyMeeting[i].meetingName.replace(/ /g, "_"),
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
      dirString(`${destinationDirectory}`) +
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
      try {
        let x = await fetchURL(races[i].races.data.races[j]["_links"]["form"]);
        console.log(`${races[i].races.data.races[j]["_links"]["form"]}`);
        console.log(x);
        form.push({
          venueName: races[i].venueName,
          raceNumber: races[i].races.data.races[j].raceNumber,
          form: x.data.form,
        });
      } catch {}
    }
  }

  //! save runner form for each race at all meetings in a single monolithic file
  saveDataToFile({
    filePath:
      dirString(destinationDirectory) +
      `/${date}-${timeHHMMSS}-all-meetings-races-form-DATA.json`,
    data: form,
  });

  //! get form for runners in each race and save to individual race files
  for (let i = 0; i < form.length; i++) {
    saveDataToFile({
      filePath:
        dirString(`${destinationDirectory}/${raceType}/${form[i].venueName}`) +
        `/${date}-${form[i].venueName}-race-${form[i].raceNumber}-form-DATA.json`,
      data: form[i],
    });
  }
  console.log(form);

  //! /////////////////////////////////////////
  let moreForm = [];
  for (let i = 0; i < races.length; i++) {
    for (let j = 0; j < races[i].races.data.races.length; j++) {
      try {
        let x = await fetchURL(races[i].races.data.races[j]["_links"]["self"]);
        console.log(`${races[i].races.data.races[j]["_links"]["self"]}`);
        console.log(x);
        moreForm.push({
          venueName: races[i].venueName,
          raceNumber: races[i].races.data.races[j].raceNumber,
          form: x,
        });
      } catch {}
    }
  }

  //! save runner form for each race at all meetings in a single monolithic file
  saveDataToFile({
    filePath:
      dirString(destinationDirectory) +
      `/${date}-${timeHHMMSS}-all-meetings-races-moreForm-DATA.json`,
    data: moreForm,
  });

  //! get form for runners in each race and save to individual race files
  for (let i = 0; i < moreForm.length; i++) {
    try {
      saveDataToFile({
        filePath:
          dirString(
            `${destinationDirectory}/${raceType}/${moreForm[i].venueName}`,
          ) +
          `/${date}-${moreForm[i].venueName}-race-${moreForm[i].raceNumber}-moreForm-DATA.json`,
        data: moreForm[i],
      });
    } catch {}
  }
  console.log(moreForm);
  //! /////////////////////////////////////////
}

async function resultFetch({ arrayRef, raceType, date }) {
  saveDataToFile({
    filePath: `./data/${dayBefore(date)}/${dayBefore(date)}-${raceType}-RESULTS.json`,
    data: arrayRef,
  });

  for (let i = 0; i < arrayRef.length; i++) {
    let arr = [];

    for (let j = 0; j < arrayRef[i].races.length; j++) {
      arr.push(arrayRef[i].races[j].results);
    }

    saveDataToFile({
      filePath:
        dirString(`./data/${dayBefore(date)}/results/${raceType}/`) +
        `${dayBefore(date)}-${arrayRef[i].meetingName.replace(/ /g, "_")}-RESULTS.json`,
      data: arrayRef[i],
    });

    console.log(arrayRef[i]);

    let raceResults = [];

    for (let j = 0; j < arrayRef[i].races.length; j++) {
      let x = await fetchURL(arrayRef[i].races[j]._links.self);

      saveDataToFile({
        filePath:
          dirString(
            `./data/${dayBefore(date)}/results/${raceType}/${arrayRef[i].meetingName.replace(/ /g, "_")}/`,
          ) +
          `${dayBefore(date)}-${arrayRef[i].meetingName.replace(/ /g, "_")}-race-${arrayRef[i].races[j].raceNumber}-RESULTS.json`,
        data: x,
      });

      raceResults.push(x);

      console.log(x);

      if (j == arrayRef[i].races.length - 1) {
        saveDataToFile({
          filePath:
            dirString(
              `./data/${dayBefore(date)}/results/${raceType}/${arrayRef[i].meetingName.replace(/ /g, "_")}/`,
            ) +
            `${dayBefore(date)}-${arrayRef[i].meetingName.replace(/ /g, "_")}-ALL-RACES-RESULTS.json`,
          data: raceResults,
        });
      }
    }

    saveDataToFile({
      filePath:
        dirString(`./data/${dayBefore(date)}/results/${raceType}/`) +
        `${dayBefore(date)}-${arrayRef[i].meetingName.replace(/ /g, "_")}-RESULTS-ONLY.json`,
      data: arr,
    });
    console.log(arr);
  }
}

async function scrape({
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
  greyhoundsExcludedVenuesArray,
  harnessExcludedVenuesArray,
  horsesExcludedVenuesArray,
}) {
  let alreadyCapturedVenues = [];

  //! try to load already captured venues, otherwise if it cant load it will stay as an empty array.
  try {
    alreadyCapturedVenues = readDataFromFile(
      `./data/${date}/${date}-captured-venues.json`,
    );
  } catch {}

  //! subdir by date to better organize data before appropriate processing
  let newDir = dirString(destinationDirectory + `/${date}`);
  destinationDirectory = newDir;

  downloadDailyMeeting
    ? await fetchAndSaveDailyMeetings({
        date: date,
        filePath: dirString(destinationDirectory) + `/${date}.json`,
      })
    : console.log("presumably downloaded");
  let dailyMeetings = readDataFromFile(
    `${loadDirectory ? loadDirectory : destinationDirectory}/${date}.json`,
  );

  //! filter out the already downloaded data in alreadyCapturedVenues
  dailyMeetings = {
    data: {
      meetings: dailyMeetings.data.meetings.filter(
        (meeting) =>
          !alreadyCapturedVenues.includes(
            meeting.meetingName.replace(/ /g, "_"),
          ),
      ),
    },
  };

  //! further filtering by excluding locations, although all will try/catch and fail gracefully if there is no race link etc
  let dailyGreyhounds = await filterMeetingByExludingJurisdictions({
    meetingData: dailyMeetings,
    raceType: "G",
    arrayOfExclusionStrings: greyhoundsExcludedLocationsArray,
    arrayOfVenueNameExclusionStrings: greyhoundsExcludedVenuesArray,
    namesOnly: false,
  });

  let dailyHarness = await filterMeetingByExludingJurisdictions({
    meetingData: dailyMeetings,
    raceType: "H",
    arrayOfExclusionStrings: harnessExcludedLocationsArray,
    arrayOfVenueNameExclusionStrings: harnessExcludedVenuesArray,
    namesOnly: false,
  });

  let dailyHorses = await filterMeetingByExludingJurisdictions({
    meetingData: dailyMeetings,
    raceType: "R",
    arrayOfExclusionStrings: horsesExcludedLocationsArray,
    arrayOfVenueNameExclusionStrings: horsesExcludedVenuesArray,
    namesOnly: false,
  });

  //! save the meetings in separate files via race type then capture race data from venues
  if (greyhounds) {
    saveDataToFile({
      filePath:
        dirString(`${destinationDirectory}`) +
        `/${date}-${timeHHMMSS}-G-meetings.json`,
      data: dailyGreyhounds,
    });

    await capture({
      dailyMeeting: dailyGreyhounds,
      raceType: "G",
      date: date,
      destinationDirectory: destinationDirectory,
      alreadyCapturedVenues: alreadyCapturedVenues,
    });
  }

  if (harness) {
    saveDataToFile({
      filePath:
        dirString(`${destinationDirectory}`) +
        `/${date}-${timeHHMMSS}-H-meetings.json`,
      data: dailyHarness,
    });

    await capture({
      dailyMeeting: dailyHarness,
      raceType: "H",
      date: date,
      destinationDirectory: destinationDirectory,
      alreadyCapturedVenues: alreadyCapturedVenues,
    });
  }

  if (horses) {
    saveDataToFile({
      filePath:
        dirString(`${destinationDirectory}`) +
        `/${date}-${timeHHMMSS}-R-meetings.json`,
      data: dailyHorses,
    });

    await capture({
      dailyMeeting: dailyHorses,
      raceType: "R",
      date: date,
      destinationDirectory: destinationDirectory,
      alreadyCapturedVenues: alreadyCapturedVenues,
    });
  }

  //! save the alreadyCapturedVenues data
  saveDataToFile({
    filePath: `${destinationDirectory}/${date}-captured-venues.json`,
    data: alreadyCapturedVenues,
  });

  if (resulted) {
    let results = await fetchResultsByDate({ date: dayBefore(date) });

    let greyResults = await filterMeetingByExludingJurisdictions({
      meetingData: results,
      raceType: "G",
      namesOnly: false,
      arrayOfVenueNameExclusionStrings: greyhoundsExcludedVenuesArray,
      arrayOfExclusionStrings: greyhoundsExcludedLocationsArray,
    });

    let harnessResults = await filterMeetingByExludingJurisdictions({
      meetingData: results,
      raceType: "H",
      namesOnly: false,
      arrayOfVenueNameExclusionStrings: harnessExcludedVenuesArray,
      arrayOfExclusionStrings: harnessExcludedLocationsArray,
    });

    let horseResults = await filterMeetingByExludingJurisdictions({
      meetingData: results,
      raceType: "R",
      namesOnly: false,
      arrayOfVenueNameExclusionStrings: horsesExcludedVenuesArray,
      arrayOfExclusionStrings: horsesExcludedLocationsArray,
    });

    if(fs.existsSync(`./data/${dayBefore(date)}/G`)){
      resultFetch({ arrayRef: greyResults, raceType: "G", date: date });
    }
    if(fs.existsSync(`./data/${dayBefore(date)}/H`)){
      resultFetch({ arrayRef: harnessResults, raceType: "H", date: date });
    }
    if(fs.existsSync(`./data/${dayBefore(date)}/R`)){
      resultFetch({ arrayRef: horseResults, raceType: "R", date: date });
    }

    saveDataToFile({
      filePath: `./data/${dayBefore(date)}/${dayBefore(date)}-all-RESULTS.json`,
      data: results,
    });
  }

  let races = await getAllRaceFiles({
    dir: "./data",
  });
  saveDataToFile({
    filePath: dirString("./data/metadata") + "/racePaths.json",
    data: races,
  });

  let racePathsGrouped = await getRacePathsAsGroupedObject();
  saveDataToFile({
    filePath: dirString("./data/metadata") + "/racePathsGrouped.json",
    data: racePathsGrouped,
  });

  await pairPaths();
}

async function getAllFiles({
  dir,
  relativeDir = "./",
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
    results[i] = `${relativeDir}${results[i]}`; // relative dirs
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
  relativeDir = "./",
  excludeSubstrings = [],
  mustIncludeSubstrings = [],
}) {
  let results = await getAllFiles({
    dir: dir,
    relativeDir: relativeDir,
    excludeSubstrings: [
      ...excludeSubstrings,
      "moreForm",
      "race-DATA",
      "all-meetings",
      "meetings",
      "racePaths",
      "RESULTS",
    ],
    mustIncludeSubstrings: [...mustIncludeSubstrings, "race", "form-DATA"],
  });

  let resultsOfRaces = await getAllFiles({
    dir: dir,
    relativeDir: relativeDir,
    excludeSubstrings: [
      ...excludeSubstrings,
      "ALL-RACES",
      "moreForm",
      "form-DATA",
      "moreForm",
      "race-DATA",
      "all-meetings",
      "meetings",
      "racePaths",
    ],
    mustIncludeSubstrings: ["race", "RESULTS.json"],
  });
  let extendedFormOfRaces = await getAllFiles({
    dir: dir,
    relativeDir: relativeDir,
    excludeSubstrings: [
      ...excludeSubstrings,
      "race-DATA",
      "all-meetings",
      "meetings",
      "racePaths",
      "races",
    ],
    mustIncludeSubstrings: [...mustIncludeSubstrings, "moreForm"],
  });

  let greys = [];
  let harness = [];
  let horses = [];

  let greysResults = [];
  let harnessResults = [];
  let horsesResults = [];

  let greysMoreForm = [];
  let harnessMoreForm = [];
  let horsesMoreForm = [];

  for (let str of results) {
    if (str.includes("/G/")) {
      greys.push(str);
    } else if (str.includes("/H/")) {
      harness.push(str);
    } else if (str.includes("/R/")) {
      horses.push(str);
    }
  }

  for (let str of resultsOfRaces) {
    if (str.includes("/G/")) {
      if (str.includes("race")) {
        greysResults.push(str);
      }
    } else if (str.includes("/H/")) {
      if (str.includes("race")) {
        harnessResults.push(str);
      }
    } else if (str.includes("/R/")) {
      if (str.includes("race")) {
        horsesResults.push(str);
      }
    }
  }

  for (let str of extendedFormOfRaces) {
    if (str.includes("/G/")) {
      greysMoreForm.push(str);
    } else if (str.includes("/H/")) {
      harnessMoreForm.push(str);
    } else if (str.includes("/R/")) {
      horsesMoreForm.push(str);
    }
  }

  greys.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  harness.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  horses.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  greysMoreForm.sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
  harnessMoreForm.sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
  horsesMoreForm.sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );

  greysResults.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  harnessResults.sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
  horsesResults.sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );

  return {
    greys,
    harness,
    horses,
    greysExtendedForm: greysMoreForm,
    harnessExtendedForm: harnessMoreForm,
    horsesExtendedForm: horsesMoreForm,
    results: { greysResults, harnessResults, horsesResults },
    greyCount: greys.length,
    harnessCount: harness.length,
    horsesCount: horses.length,
    greysExtendedFormCount: greysMoreForm.length,
    harnessExtendedFormCount: harnessMoreForm.length,
    horsesExtendedFormCount: horsesMoreForm.length,
    greysResultsCount: greysResults.length,
    harnessResultsCount: harnessResults.length,
    horsesResultsCount: horsesResults.length,
  };
}

async function downloadFile({ url, dir, filename }) {
  try {
    const filePath = dirString(dir) + "/" + filename;

    const response = await fetch(url);
    if (!response.ok) throw new Error("Download failed");

    await pipeline(response.body, fs.createWriteStream(filePath));
  } catch {
    console.log(`unable to download file of URL: ${url}`);
  }
}

async function getRacePathsAsGroupedObject() {
  let data = await getAllRaceFiles({ dir: "./data" });
  let greys = [];
  let harness = [];
  let horses = [];

  let greysExtendedForm = [];
  let harnessExtendedForm = [];
  let horsesExtendedForm = [];

  let greysResults = [];
  let harnessResults = [];
  let horsesResults = [];

  for (let i = 0; i < data.greys.length; i++) {
    greys.push({
      pathless: path.basename(data.greys[i]),
      pathed: data.greys[i],
    });
  }
  for (let i = 0; i < data.harness.length; i++) {
    harness.push({
      pathless: path.basename(data.harness[i]),
      pathed: data.harness[i],
    });
  }
  for (let i = 0; i < data.horses.length; i++) {
    horses.push({
      pathless: path.basename(data.horses[i]),
      pathed: data.horses[i],
    });
  }

  for (let i = 0; i < data.greysExtendedForm.length; i++) {
    greysExtendedForm.push({
      pathless: path.basename(data.greysExtendedForm[i]),
      pathed: data.greysExtendedForm[i],
    });
  }
  for (let i = 0; i < data.harnessExtendedForm.length; i++) {
    harnessExtendedForm.push({
      pathless: path.basename(data.harnessExtendedForm[i]),
      pathed: data.harnessExtendedForm[i],
    });
  }
  for (let i = 0; i < data.horsesExtendedForm.length; i++) {
    horsesExtendedForm.push({
      pathless: path.basename(data.horsesExtendedForm[i]),
      pathed: data.horsesExtendedForm[i],
    });
  }

  for (let i = 0; i < data.results.greysResults.length; i++) {
    greysResults.push({
      pathless: path.basename(data.results.greysResults[i]),
      pathed: data.results.greysResults[i],
    });
  }
  for (let i = 0; i < data.results.harnessResults.length; i++) {
    harnessResults.push({
      pathless: path.basename(data.results.harnessResults[i]),
      pathed: data.results.harnessResults[i],
    });
  }
  for (let i = 0; i < data.results.horsesResults.length; i++) {
    horsesResults.push({
      pathless: path.basename(data.results.horsesResults[i]),
      pathed: data.results.horsesResults[i],
    });
  }

  let groupedByDate = {
    greys: {},
    harness: {},
    horses: {},
    greysExtendedForm: {},
    harnessExtendedForm: {},
    horsesExtendedForm: {},
    greysResults: {},
    harnessResults: {},
    horsesResults: {},
  };

  for (let i = 0; i < greys.length; i++) {
    let date = greys[i].pathless.slice(0, 10);

    if (!groupedByDate.greys[date]) {
      groupedByDate.greys[date] = {};
    }
    if (!groupedByDate.greys[date][greys[i].pathless.split("-")[3]]) {
      groupedByDate.greys[date][greys[i].pathless.split("-")[3]] = [];
    }
    await groupedByDate.greys[date][greys[i].pathless.split("-")[3]].push(
      greys[i],
    );
  }

  for (let i = 0; i < harness.length; i++) {
    let date = harness[i].pathless.slice(0, 10);

    if (!groupedByDate.harness[date]) {
      groupedByDate.harness[date] = {};
    }

    if (!groupedByDate.harness[date][harness[i].pathless.split("-")[3]]) {
      groupedByDate.harness[date][harness[i].pathless.split("-")[3]] = [];
    }
    groupedByDate.harness[date][harness[i].pathless.split("-")[3]].push(
      harness[i],
    );
  }

  for (let i = 0; i < horses.length; i++) {
    let date = horses[i].pathless.slice(0, 10);

    if (!groupedByDate.horses[date]) {
      groupedByDate.horses[date] = {};
    }

    if (!groupedByDate.horses[date][horses[i].pathless.split("-")[3]]) {
      groupedByDate.horses[date][horses[i].pathless.split("-")[3]] = [];
    }
    groupedByDate.horses[date][horses[i].pathless.split("-")[3]].push(
      horses[i],
    );
  }

  for (let i = 0; i < greysExtendedForm.length; i++) {
    let date = greysExtendedForm[i].pathless.slice(0, 10);

    if (!groupedByDate.greysExtendedForm[date]) {
      groupedByDate.greysExtendedForm[date] = {};
    }

    if (
      !groupedByDate.greysExtendedForm[date][
        greysExtendedForm[i].pathless.split("-")[3]
      ]
    ) {
      groupedByDate.greysExtendedForm[date][
        greysExtendedForm[i].pathless.split("-")[3]
      ] = [];
    }

    await groupedByDate.greysExtendedForm[date][
      greysExtendedForm[i].pathless.split("-")[3]
    ].push(greysExtendedForm[i]);
  }

  for (let i = 0; i < harnessExtendedForm.length; i++) {
    let date = harnessExtendedForm[i].pathless.slice(0, 10);

    if (!groupedByDate.harnessExtendedForm[date]) {
      groupedByDate.harnessExtendedForm[date] = {};
    }

    if (
      !groupedByDate.harnessExtendedForm[date][
        harnessExtendedForm[i].pathless.split("-")[3]
      ]
    ) {
      groupedByDate.harnessExtendedForm[date][
        harnessExtendedForm[i].pathless.split("-")[3]
      ] = [];
    }

    await groupedByDate.harnessExtendedForm[date][
      harnessExtendedForm[i].pathless.split("-")[3]
    ].push(harnessExtendedForm[i]);
  }

  for (let i = 0; i < horsesExtendedForm.length; i++) {
    let date = horsesExtendedForm[i].pathless.slice(0, 10);

    if (!groupedByDate.horsesExtendedForm[date]) {
      groupedByDate.horsesExtendedForm[date] = {};
    }

    if (
      !groupedByDate.horsesExtendedForm[date][
        horsesExtendedForm[i].pathless.split("-")[3]
      ]
    ) {
      groupedByDate.horsesExtendedForm[date][
        horsesExtendedForm[i].pathless.split("-")[3]
      ] = [];
    }

    await groupedByDate.horsesExtendedForm[date][
      horsesExtendedForm[i].pathless.split("-")[3]
    ].push(horsesExtendedForm[i]);
  }

  for (let i = 0; i < greysResults.length; i++) {
    let date = greysResults[i].pathless.slice(0, 10);

    if (!groupedByDate.greysResults[date]) {
      groupedByDate.greysResults[date] = {};
    }

    if (
      !groupedByDate.greysResults[date][greysResults[i].pathless.split("-")[3]]
    ) {
      groupedByDate.greysResults[date][greysResults[i].pathless.split("-")[3]] =
        [];
    }

    if (greysResults[i].pathed.includes("race")) {
      await groupedByDate.greysResults[date][
        greysResults[i].pathless.split("-")[3]
      ].push(greysResults[i]);
    }
  }

  for (let i = 0; i < harnessResults.length; i++) {
    let date = harnessResults[i].pathless.slice(0, 10);

    if (!groupedByDate.harnessResults[date]) {
      groupedByDate.harnessResults[date] = {};
    }

    if (
      !groupedByDate.harnessResults[date][
        harnessResults[i].pathless.split("-")[3]
      ]
    ) {
      groupedByDate.harnessResults[date][
        harnessResults[i].pathless.split("-")[3]
      ] = [];
    }

    if (harnessResults[i].pathed.includes("race")) {
      await groupedByDate.harnessResults[date][
        harnessResults[i].pathless.split("-")[3]
      ].push(harnessResults[i]);
    }
  }

  for (let i = 0; i < horsesResults.length; i++) {
    let date = horsesResults[i].pathless.slice(0, 10);

    if (!groupedByDate.horsesResults[date]) {
      groupedByDate.horsesResults[date] = {};
    }

    if (
      !groupedByDate.horsesResults[date][
        horsesResults[i].pathless.split("-")[3]
      ]
    ) {
      groupedByDate.horsesResults[date][
        horsesResults[i].pathless.split("-")[3]
      ] = [];
    }

    if (horsesResults[i].pathed.includes("race")) {
      await groupedByDate.horsesResults[date][
        horsesResults[i].pathless.split("-")[3]
      ].push(horsesResults[i]);
    }
  }

  return groupedByDate;
}


/**
 * pairs our race form, extendedForm/moreForm, and results data for each race at each venue, this will make it easy for the processing of each split set of data to be merged/processed next up before i add everything into a sqlDB; currently only working for greyhounds, will extend later if i choose to
 *
 * @async
 * @returns {*} 
 */
async function pairPaths() {
  let data = readDataFromFile("./data/metadata/racePathsGrouped.json");
  let greysRaceData = data.greys;
  let greysExtendedFormData = data.greysExtendedForm;
  let greysResults = data.greysResults;

  let out = [];

  let groups = {};
  let groupsOut = [];

  // gets a key to check for pairings; split at / and popping the last one to get file, replacing json with "", splitting at each -, slicing the array for the first 7 pieces 0-6, and joining again with -
  let raceKey = (path) =>
    path.split("/").pop().replace(".json", "").split("-").slice(0, 6).join("-");

  // push all paths to the array
  for (let date of Object.keys(greysResults)) {
    for (let venue of Object.keys(greysResults[date])) {
      for (let race = 0; race < greysResults[date][venue].length; race++) {
        out.push(greysResults[date][venue][race].pathed);
      }
    }
  }
  
  // push all paths to the array; filtered by dates that are in results
  for (let date of Object.keys(greysResults).filter((d) =>
    Object.keys(greysRaceData).includes(d),
)) {
  for (let venue of Object.keys(greysRaceData[date])) {
    for (let race = 0; race < greysRaceData[date][venue].length; race++) {
      out.push(greysRaceData[date][venue][race].pathed);
    }
  }
}

// push all paths to the array; filtered by dates that are in results
  for (let date of Object.keys(greysResults).filter((d) =>
    Object.keys(greysExtendedFormData).includes(d),
  )) {
    for (let venue of Object.keys(greysExtendedFormData[date])) {
      for (
        let race = 0;
        race < greysExtendedFormData[date][venue].length;
        race++
      ) {
        out.push(greysExtendedFormData[date][venue][race].pathed);
      }
    }
  }

  // for each file in out array
  for (const file of out) {
    // get the key of the string
    const key = raceKey(file);

    // if it isnt a key then it is made to one
    if (!groups[key]) {
      groups[key] = {
        raceForm: null,
        moreForm: null,
        result: null,
        raceType: null
      };
    }

    // splitting at - again to an array
    const parts = file.split("-");

    // if the array includes the below then add ass properties where appropriate
    if (parts.includes("moreForm")) {
      groups[key].moreForm = file;
    } else if (parts.includes("form")) {
      groups[key].raceForm = file;
    } else if (parts.includes("RESULTS.json")) {
      groups[key].result = file;
    }
  }

  let orphaned = [];

  // for each key in our object
  for (const key of Object.keys(groups)) {
    const g = groups[key]; // the object at that key

    // if one or more of these filePaths
    if (g.raceForm === null || g.moreForm === null || g.result === null) {
      // delete from object
      let rt = "";
      if(g.raceForm !== null)
      {
        if(g.raceForm.includes("/G/")) rt = "G"
        if(g.raceForm.includes("/H/")) rt = "H"
        if(g.raceForm.includes("/R/")) rt = "R"
      } else if(g.moreForm !== null)
      {
        if(g.moreForm.includes("/G/")) rt = "G"
        if(g.moreForm.includes("/H/")) rt = "H"
        if(g.moreForm.includes("/R/")) rt = "R"
      } else if(g.result !== null)
      {
        if(g.result.includes("/G/")) rt = "G"
        if(g.result.includes("/H/")) rt = "H"
        if(g.result.includes("/R/")) rt = "R"
      }
      g.raceType = rt;
      orphaned.push(g)
    }

    // add racetypes for future when i might add harness and horses; then can filter by racetype
    else if(g.raceForm.includes("/G/") || g.moreForm.includes("/G/") || g.result.includes("/G/"))
    {
      groups[key].raceType = "G";
    }else if(g.raceForm.includes("/H/") || g.moreForm.includes("/H/") || g.result.includes("/H/"))
    {
      groups[key].raceType = "H";
    }else if(g.raceForm.includes("/R/") || g.moreForm.includes("/R/") || g.result.includes("/R/"))
    {
      groups[key].raceType = "R";
    }

    // push the object at the key in our global object to an array to get an array of object pairings; also exclude orphans
    if(g.raceForm !== null && g.moreForm !== null && g.result !== null){
      groupsOut.push(g);
    }
  }

  // save to file as an object with a data property holding our array of pairings/orphans, and the length(so i can view it as text in the file pretty much)
  saveDataToFile({filePath:"./data/metadata/pairedData.json", data:{data: groupsOut, length: groupsOut.length}});
  saveDataToFile({filePath:"./data/metadata/orphanedData.json", data:{data: orphaned, length: orphaned.length}});

  console.log({data: groupsOut, length: groupsOut.length});
}

function mergePairedData(){
  pairPaths();
  let data = readDataFromFile("./data/metadata/pairedData.json");

  let greys = data.data.filter((item) => item.raceType === "G");
  
  for(let item of greys)
  {
    try{
      let raceForm = readDataFromFile(item.raceForm);
    let extendedForm = readDataFromFile(item.moreForm);
    let result = readDataFromFile(item.result);
    let test = {...raceForm, ...extendedForm, ...result};
    console.log(test)
    console.log("=============================================")
    console.log("=============================================")
    console.log(item.raceForm.split("/").pop())
    console.log("=============================================")
    console.log("=============================================")
    }catch(e){
      console.log(item.raceForm.split("/").pop())
      console.log(item.moreForm.split("/").pop())
      console.log(item.result.split("/").pop())
      console.log(e)
    }
  }
}

/*
scrape({
  destinationDirectory: "./data",
  date: "2026-04-17",
  download: false,
  resulted: false,
  greyhounds: false,
  harness: false,
  horses: false, // keep false until i decide to use the data, taking too much already
  greyhoundsExcludedVenuesArray: [],
  //harnessExcludedVenuesArray:[],
  //horsesExcludedVenuesArray: ["LAUREL PARK", "LEOPARDSTOWN", "SHA TIN"],
  greyhoundsExcludedLocationsArray: ["GBR", "NZL", "IRL"],
  //harnessExcludedLocationsArray: ["CAN"],
  //horsesExcludedLocationsArray: ["ARG", "HKG"],
  ! not sure whether to exclude by location or venue name or just exclude races later based off of lacking specific data points or maybe just keeping all races for training irregardless of data points that are present; probably better to keep all races.
});
*/

mergePairedData()

//console.log(x.harnessResults['2026-04-13'])

/* //! download videos and audio

let x = readDataFromFile("./data/2026-04-09/G/2026-04-09-MANDURAH-race-DATA.json");

let indices = 3;

let vidURL = x.data.races[indices].skyRacing.video
let vm = x.data.races[indices].pools[0].legs[0].venueMnemonic;
let rn = x.data.races[indices].raceNumber;
let date = "2026-04-09";

console.log(vidURL)

downloadFile({url:vidURL, dir:"./data/test", filename:`${date}-${vm}-${rn}.mp4`});
*/ //!!!!!!!!!!!!!!

// when i upload this to aws to automate, when it runs every 5 mins i may redownload the meetings each time and update what races to download; tralee in irl for G wasnt listed earlier or id have it, the irish dogs seem to have good form info too; ill have to think more about this stuff
