const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING(80),
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active'
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      beforeCreate: async (user) => {
        if (user.password_hash && !user.password_hash.startsWith('$')) {
          user.password_hash = await bcrypt.hash(user.password_hash, 12);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password_hash') && !user.password_hash.startsWith('$')) {
          user.password_hash = await bcrypt.hash(user.password_hash, 12);
        }
      }
    }
  });

  // Instance methods
  User.prototype.checkPassword = async function(password) {
    // Handle both hashed and plain text passwords for demo
    if (this.password_hash.startsWith('$')) {
      return await bcrypt.compare(password, this.password_hash);
    } else {
      // For demo purposes, allow plain text comparison
      return this.password_hash === password;
    }
  };

  User.prototype.setPassword = async function(password) {
    this.password_hash = await bcrypt.hash(password, 12);
  };

  User.prototype.hasPermission = function(moduleName, action) {
    if (!this.role || !this.role.moduleAccess) return false;
    
    const access = this.role.moduleAccess.find(a => a.module_name === moduleName);
    if (!access) return false;
    
    return access[`can_${action}`] || false;
  };

  User.prototype.toJSON = function() {
    const values = { ...this.get() };
    delete values.password_hash;
    return values;
  };

  return User;
};