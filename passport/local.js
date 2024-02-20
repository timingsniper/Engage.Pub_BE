const passport = require("passport");
const { Strategy: LocalStrategy } = require("passport-local");
const bcrypt = require("bcrypt");
const { User } = require("../models");

module.exports = () => {
    passport.use(new LocalStrategy({
      usernameField: 'email',
      passwordField: 'password',
    }, async (email, password, done) => {
      try {
        const user = await User.findOne({
          where: { email }
        });
        if (!user) {
          return done(null, false, { reason: 'User does not exist.' });
        }
        const result = await bcrypt.compare(password, user.password);
        if (result) {
          return done(null, user);
        }
        return done(null, false, { reason: 'Wrong password.' });
      } catch (error) {
        console.error(error);
        return done(error);
      }
    }));
  };