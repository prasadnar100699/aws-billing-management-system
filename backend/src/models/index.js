const { sequelize } = require('../config/db');
const { DataTypes } = require('sequelize');

// Import all models
const Role = require('./Role')(sequelize, DataTypes);
const RoleModuleAccess = require('./RoleModuleAccess')(sequelize, DataTypes);
const User = require('./User')(sequelize, DataTypes);
const AuditLog = require('./AuditLog')(sequelize, DataTypes);
const ServiceCategory = require('./ServiceCategory')(sequelize, DataTypes);
const Service = require('./Service')(sequelize, DataTypes);
const PricingComponent = require('./PricingComponent')(sequelize, DataTypes);
const Client = require('./Client')(sequelize, DataTypes);
const ClientAwsMapping = require('./ClientAwsMapping')(sequelize, DataTypes);
const Invoice = require('./Invoice')(sequelize, DataTypes);
const InvoiceLineItem = require('./InvoiceLineItem')(sequelize, DataTypes);
const InvoiceAttachment = require('./InvoiceAttachment')(sequelize, DataTypes);
const InvoiceTemplate = require('./InvoiceTemplate')(sequelize, DataTypes);
const UsageImport = require('./UsageImport')(sequelize, DataTypes);
const Document = require('./Document')(sequelize, DataTypes);
const Notification = require('./Notification')(sequelize, DataTypes);

// Define associations
const defineAssociations = () => {
  // Role associations
  Role.hasMany(User, { foreignKey: 'role_id', as: 'users' });
  Role.hasMany(RoleModuleAccess, { foreignKey: 'role_id', as: 'moduleAccess' });

  // User associations
  User.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
  User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'auditLogs' });
  User.belongsToMany(Client, { 
    through: 'user_client_mappings', 
    foreignKey: 'user_id',
    otherKey: 'client_id',
    as: 'assignedClients'
  });

  // RoleModuleAccess associations
  RoleModuleAccess.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });

  // ServiceCategory associations
  ServiceCategory.hasMany(Service, { foreignKey: 'service_category_id', as: 'services' });

  // Service associations
  Service.belongsTo(ServiceCategory, { foreignKey: 'service_category_id', as: 'category' });
  Service.hasMany(PricingComponent, { foreignKey: 'service_id', as: 'pricingComponents' });

  // PricingComponent associations
  PricingComponent.belongsTo(Service, { foreignKey: 'service_id', as: 'service' });
  PricingComponent.hasMany(InvoiceLineItem, { foreignKey: 'component_id', as: 'lineItems' });

  // Client associations
  Client.hasMany(ClientAwsMapping, { foreignKey: 'client_id', as: 'awsMappings' });
  Client.hasMany(Invoice, { foreignKey: 'client_id', as: 'invoices' });
  Client.hasMany(UsageImport, { foreignKey: 'client_id', as: 'usageImports' });
  Client.hasMany(Document, { foreignKey: 'client_id', as: 'documents' });
  Client.hasMany(Notification, { foreignKey: 'client_id', as: 'notifications' });
  Client.belongsToMany(User, { 
    through: 'user_client_mappings', 
    foreignKey: 'client_id',
    otherKey: 'user_id',
    as: 'assignedManagers'
  });

  // ClientAwsMapping associations
  ClientAwsMapping.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });

  // Invoice associations
  Invoice.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });
  Invoice.hasMany(InvoiceLineItem, { foreignKey: 'invoice_id', as: 'lineItems' });
  Invoice.hasMany(InvoiceAttachment, { foreignKey: 'invoice_id', as: 'attachments' });
  Invoice.hasMany(Document, { foreignKey: 'invoice_id', as: 'documents' });

  // InvoiceLineItem associations
  InvoiceLineItem.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });
  InvoiceLineItem.belongsTo(PricingComponent, { foreignKey: 'component_id', as: 'pricingComponent' });

  // InvoiceAttachment associations
  InvoiceAttachment.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });

  // InvoiceTemplate associations
  InvoiceTemplate.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });

  // UsageImport associations
  UsageImport.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });

  // Document associations
  Document.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploadedByUser' });
  Document.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });
  Document.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });

  // Notification associations
  Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  Notification.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });

  // AuditLog associations
  AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
};

// Initialize models
const models = {
  Role,
  RoleModuleAccess,
  User,
  AuditLog,
  ServiceCategory,
  Service,
  PricingComponent,
  Client,
  ClientAwsMapping,
  Invoice,
  InvoiceLineItem,
  InvoiceAttachment,
  InvoiceTemplate,
  UsageImport,
  Document,
  Notification,
  sequelize
};

// Define associations
defineAssociations();

module.exports = models;