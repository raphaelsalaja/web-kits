import { phase } from "./scene";

// One loop shared by every tile, so they take turns rather than all moving
// at once. Each tile is a pure function of where the loop is.
//
//   0.40  Time     three snapshots back, the front windows flying past
//   1.15  Tabs     the pill jumps from Day to Year
//   1.70  Dialog   the pointer clicks Delete Project; Cancel at 3.5
//   2.60  Drawer   the share sheet slides up; away at 4.6
//   3.30  Kanban   a task is thrown from To Do into Done
//   4.00  Toasts   a success toast slides up into the column
//   5.40  Time     two snapshots forward
//   6.10  Tabs     back to Week
//   6.80  Toasts   the success toast is swiped away
//   7.50  Kanban   the task is thrown back
//   7.70  Dialog   again, cancelled at 9.6
//   8.20  Time     the last one forward, where it began
//   8.40  Drawer   up again, half a loop on; away at 10.4
//   8.90  Tabs     home to Day

const LOOP = 11.6;

export const BEATS = {
  travel: [
    { at: 0.4, by: 3 },
    { at: 5.4, by: -2 },
    { at: 8.2, by: -1 },
  ],
  tabs: [1.15, 6.1, 8.9],
  dialog: [
    { open: 1.7, close: 3.5 },
    { open: 7.7, close: 9.6 },
  ],
  drawer: [
    { open: 2.6, close: 4.6 },
    { open: 8.4, close: 10.4 },
  ],
  throws: [3.3, 7.5],
  rise: 4.0,
  swipe: 6.8,
};

/** Where `time` falls in the loop. */
export const loopAt = (time: number) => phase(time, LOOP).at;
