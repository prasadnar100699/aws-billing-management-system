module.exports = (sequelize, DataTypes) => {
  const RoleModuleAccess = sequelize.define('RoleModuleAccess', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    module_name: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    can_view: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    can_create: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    can_edit: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    can_delete: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'role_module_access',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['role_id', 'module_name']
      }
    ]
  });

  return RoleModuleAccess;
};