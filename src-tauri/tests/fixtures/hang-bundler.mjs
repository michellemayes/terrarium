// Stand-in bundler that never finishes. Writes its pid to $HANG_PID_FILE.
import * as fs from 'fs';

if (process.env.HANG_PID_FILE) fs.writeFileSync(process.env.HANG_PID_FILE, String(process.pid));
setInterval(() => {}, 1000);
