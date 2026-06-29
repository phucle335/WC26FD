(function (root) {
  function win(group) {
    return { type: "slot", kind: "win", group, label: `1${group}` };
  }

  function run(group) {
    return { type: "slot", kind: "run", group, label: `2${group}` };
  }

  function third(groups) {
    return { type: "slot", kind: "third", groups, label: `3${groups.join("/")}` };
  }

  function winner(from) {
    return { type: "slot", kind: "winner", from, label: "" };
  }

  function loser(from) {
    return { type: "slot", kind: "loser", from, label: "" };
  }

  const THIRD_SLOT_WINNER = {
    "R32-L01": "E",
    "R32-L02": "I",
    "R32-L07": "D",
    "R32-L08": "G",
    "R32-R03": "A",
    "R32-R04": "L",
    "R32-R07": "B",
    "R32-R08": "K"
  };

  // Đã cấu trúc đúng layout Trái/Phải và CẬP NHẬT CHUẨN XÁC GIỜ UTC THỰC TẾ CỦA TỪNG TRẬN
 // Đã giữ nguyên vẹn logic chia bảng home/away gốc của bạn.
  // Chỉ map lại matchNum và UTC cho khớp hoàn toàn với giao diện.
  const R32_TEMPLATE = [
    // --- CỘT BÊN TRÁI (LEFT WING) ---
    { id: "R32-L01", wing: "left", round: "R32", matchNum: 74, utc: "2026-06-29T20:30:00Z", venue: "Boston Stadium", home: win("E"), away: third(["A", "B", "C", "D", "F"]), feeds: "R16-L01" },
    { id: "R32-L02", wing: "left", round: "R32", matchNum: 77, utc: "2026-06-30T21:00:00Z", venue: "New York / New Jersey Stadium", home: win("I"), away: third(["C", "D", "F", "G", "H"]), feeds: "R16-L01" },
    { id: "R32-L03", wing: "left", round: "R32", matchNum: 73, utc: "2026-06-28T19:00:00Z", venue: "SoFi Stadium", home: run("A"), away: run("B"), feeds: "R16-L02" },
    { id: "R32-L04", wing: "left", round: "R32", matchNum: 75, utc: "2026-06-30T01:00:00Z", venue: "Monterrey Stadium", home: win("F"), away: run("C"), feeds: "R16-L02" },
    { id: "R32-L05", wing: "left", round: "R32", matchNum: 83, utc: "2026-07-02T23:00:00Z", venue: "Toronto Stadium", home: run("K"), away: run("L"), feeds: "R16-L03" },
    { id: "R32-L06", wing: "left", round: "R32", matchNum: 84, utc: "2026-07-02T19:00:00Z", venue: "Los Angeles Stadium", home: win("H"), away: run("J"), feeds: "R16-L03" },
    { id: "R32-L07", wing: "left", round: "R32", matchNum: 81, utc: "2026-07-02T00:00:00Z", venue: "San Francisco Bay Area Stadium", home: win("D"), away: third(["B", "E", "F", "I", "J"]), feeds: "R16-L04" },
    { id: "R32-L08", wing: "left", round: "R32", matchNum: 82, utc: "2026-07-01T20:00:00Z", venue: "Seattle Stadium", home: win("G"), away: third(["A", "E", "H", "I", "J"]), feeds: "R16-L04" },

    // --- CỘT BÊN PHẢI (RIGHT WING) ---
    { id: "R32-R01", wing: "right", round: "R32", matchNum: 76, utc: "2026-06-29T17:00:00Z", venue: "Houston Stadium", home: win("C"), away: run("F"), feeds: "R16-R01" },
    { id: "R32-R02", wing: "right", round: "R32", matchNum: 78, utc: "2026-06-30T17:00:00Z", venue: "Dallas Stadium", home: run("E"), away: run("I"), feeds: "R16-R01" },
    { id: "R32-R03", wing: "right", round: "R32", matchNum: 79, utc: "2026-07-01T01:00:00Z", venue: "Mexico City Stadium", home: win("A"), away: third(["C", "E", "F", "H", "I"]), feeds: "R16-R02" },
    { id: "R32-R04", wing: "right", round: "R32", matchNum: 80, utc: "2026-07-01T16:00:00Z", venue: "Atlanta Stadium", home: win("L"), away: third(["E", "H", "I", "J", "K"]), feeds: "R16-R02" },
    { id: "R32-R05", wing: "right", round: "R32", matchNum: 86, utc: "2026-07-03T22:00:00Z", venue: "Miami Stadium", home: win("J"), away: run("H"), feeds: "R16-R03" },
    { id: "R32-R06", wing: "right", round: "R32", matchNum: 88, utc: "2026-07-03T18:00:00Z", venue: "Dallas Stadium", home: run("D"), away: run("G"), feeds: "R16-R03" },
    { id: "R32-R07", wing: "right", round: "R32", matchNum: 85, utc: "2026-07-03T03:00:00Z", venue: "Vancouver Stadium", home: win("B"), away: third(["E", "F", "G", "I", "J"]), feeds: "R16-R04" },
    { id: "R32-R08", wing: "right", round: "R32", matchNum: 87, utc: "2026-07-04T01:30:00Z", venue: "Kansas City Stadium", home: win("K"), away: third(["D", "E", "I", "J", "L"]), feeds: "R16-R04" }
  ];

  const KNOCKOUT_PROGRESS_TEMPLATE = [
    { id: "R16-L01", wing: "left", round: "R16", matchNum: 89, utc: "2026-07-04T21:00:00Z", venue: "Philadelphia Stadium", home: winner("R32-L01"), away: winner("R32-L02"), feeds: "QF-L01" },
    { id: "R16-L02", wing: "left", round: "R16", matchNum: 90, utc: "2026-07-04T17:00:00Z", venue: "Houston Stadium", home: winner("R32-L03"), away: winner("R32-L04"), feeds: "QF-L01" },
    { id: "R16-L03", wing: "left", round: "R16", matchNum: 93, utc: "2026-07-06T19:00:00Z", venue: "Dallas Stadium", home: winner("R32-L05"), away: winner("R32-L06"), feeds: "QF-L02" },
    { id: "R16-L04", wing: "left", round: "R16", matchNum: 94, utc: "2026-07-07T00:00:00Z", venue: "Seattle Stadium", home: winner("R32-L07"), away: winner("R32-L08"), feeds: "QF-L02" },

    { id: "R16-R01", wing: "right", round: "R16", matchNum: 91, utc: "2026-07-05T20:00:00Z", venue: "New York / New Jersey Stadium", home: winner("R32-R01"), away: winner("R32-R02"), feeds: "QF-R01" },
    { id: "R16-R02", wing: "right", round: "R16", matchNum: 92, utc: "2026-07-06T00:00:00Z", venue: "Mexico City Stadium", home: winner("R32-R03"), away: winner("R32-R04"), feeds: "QF-R01" },
    { id: "R16-R03", wing: "right", round: "R16", matchNum: 95, utc: "2026-07-07T16:00:00Z", venue: "Atlanta Stadium", home: winner("R32-R05"), away: winner("R32-R06"), feeds: "QF-R02" },
    { id: "R16-R04", wing: "right", round: "R16", matchNum: 96, utc: "2026-07-07T20:00:00Z", venue: "Vancouver Stadium", home: winner("R32-R07"), away: winner("R32-R08"), feeds: "QF-R02" },

    { id: "QF-L01", wing: "left", round: "QF", matchNum: 97, utc: "2026-07-09T20:00:00Z", venue: "Boston Stadium", home: winner("R16-L01"), away: winner("R16-L02"), feeds: "SF-L01" },
    { id: "QF-L02", wing: "left", round: "QF", matchNum: 98, utc: "2026-07-11T00:00:00Z", venue: "Los Angeles Stadium", home: winner("R16-L03"), away: winner("R16-L04"), feeds: "SF-L01" },
    { id: "QF-R01", wing: "right", round: "QF", matchNum: 99, utc: "2026-07-11T20:00:00Z", venue: "Miami Stadium", home: winner("R16-R01"), away: winner("R16-R02"), feeds: "SF-R01" },
    { id: "QF-R02", wing: "right", round: "QF", matchNum: 100, utc: "2026-07-12T01:00:00Z", venue: "Kansas City Stadium", home: winner("R16-R03"), away: winner("R16-R04"), feeds: "SF-R01" },

    { id: "SF-L01", wing: "left", round: "SF", matchNum: 101, utc: "2026-07-15T01:00:00Z", venue: "Dallas Stadium", home: winner("QF-L01"), away: winner("QF-L02"), feeds: "F" },
    { id: "SF-R01", wing: "right", round: "SF", matchNum: 102, utc: "2026-07-16T00:00:00Z", venue: "Atlanta Stadium", home: winner("QF-R01"), away: winner("QF-R02"), feeds: "F" },
    { id: "TP", wing: "center", round: "TP", matchNum: 103, utc: "2026-07-19T00:00:00Z", venue: "Miami Stadium", home: loser("SF-L01"), away: loser("SF-R01") },
    { id: "F", wing: "center", round: "F", matchNum: 104, utc: "2026-07-19T19:00:00Z", venue: "New York / New Jersey Stadium", home: winner("SF-L01"), away: winner("SF-R01") }
  ];

  function getTemplateFixtures() {
    return R32_TEMPLATE.concat(KNOCKOUT_PROGRESS_TEMPLATE).map((m) => ({ ...m }));
  }

  function getExpectedSlotLabel(slot) {
    return slot?.label || "";
  }

  root.WC26Fifa2026Bracket = {
    THIRD_SLOT_WINNER,
    getTemplateFixtures,
    getExpectedSlotLabel
  };
})(typeof globalThis !== "undefined" ? globalThis : this);