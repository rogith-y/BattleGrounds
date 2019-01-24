var mongoose = require('mongoose');
//var bcrypt = require('bcryptjs');
var UserSchema = mongoose.Schema({
	google: {
		id: String,
		token: String,
		email: String,
		level:Number
	},
	username:String
});
/*UserSchema.methods.generateHash = function(password){
	return bcrypt.hashSync(password, bcrypt.genSaltSync(9));
}
UserSchema.methods.validPassword = function(password){
	return bcrypt.compareSync(password, this.local.password);
}*/
module.exports = mongoose.model('User', UserSchema);
