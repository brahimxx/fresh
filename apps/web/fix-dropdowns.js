const fs = require('fs');
let code = fs.readFileSync('src/app/(marketplace)/layout.js', 'utf8');

code = code.replace(
  '{isBusinessUser && salons.length > 0 && (\n                        <Link href="/dashboard">\n                          <DropdownMenuItem className="cursor-pointer">\n                            <LayoutDashboard className="mr-2 h-4 w-4" />\n                            <span>Business Dashboard</span>\n                          </DropdownMenuItem>\n                        </Link>\n                      )}',
  '{isBusinessUser && salons.length > 0 && (\n                        <DropdownMenuItem asChild className="cursor-pointer">\n                          <Link href="/dashboard">\n                            <LayoutDashboard className="mr-2 h-4 w-4" />\n                            <span>Business Dashboard</span>\n                          </Link>\n                        </DropdownMenuItem>\n                      )}'
);

code = code.replace(
  '<Link href="/bookings">\n                        <DropdownMenuItem className="cursor-pointer">\n                          <Calendar className="mr-2 h-4 w-4" />\n                          <span>My Bookings</span>\n                        </DropdownMenuItem>\n                      </Link>',
  '<DropdownMenuItem asChild className="cursor-pointer">\n                        <Link href="/bookings">\n                          <Calendar className="mr-2 h-4 w-4" />\n                          <span>My Bookings</span>\n                        </Link>\n                      </DropdownMenuItem>'
);

code = code.replace(
  '<Link href="/profile">\n                        <DropdownMenuItem className="cursor-pointer">\n                          <User className="mr-2 h-4 w-4" />\n                          <span>Profile</span>\n                        </DropdownMenuItem>\n                      </Link>',
  '<DropdownMenuItem asChild className="cursor-pointer">\n                        <Link href="/profile">\n                          <User className="mr-2 h-4 w-4" />\n                          <span>Profile</span>\n                        </Link>\n                      </DropdownMenuItem>'
);

fs.writeFileSync('src/app/(marketplace)/layout.js', code);
