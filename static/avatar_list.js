
// After properly logging in, server will send us a list of
// "avatars". They are little machines that can't do anything on their
// own but instead - they rely on controlling other machines. Avatars
// are our only way of controlling the world.

logged_in = logged_in.then(function (reply) {
  var avatar_ids = reply.avatar_list;

  console.log('Retrieved avatar list', avatar_ids);

  // Although you can have much more than one avatar, the basic
  // interface included on this site, allows you to control only the
  // first one - later you could extend it to allow control over a
  // fleet of avatars or write scripts to utilize additional ones as
  // autonomus radios, mining or combat robots.

  avatar_id = avatar_ids[0];

  // In order to get some basic informations about our avatar, we
  // will isue `report` command. Report will provide information
  // about avatar location, parts that it is connected with and
  // other interesting information.

  reporter.add(avatar_id);

  return Promise.resolve();

});
