const fs = require('fs');

let code = fs.readFileSync('src/app/onboarding/page.js', 'utf8');

const target = `                        )}
                      />
                    </div>
                  </div>
                </Form>
              </div>
            )}`;

const replace = `                        )}
                      />
                    </div>
                  </div>
                </Form>
              )}
              </div>
            )}`;

code = code.replace(target, replace);
fs.writeFileSync('src/app/onboarding/page.js', code, 'utf8');
