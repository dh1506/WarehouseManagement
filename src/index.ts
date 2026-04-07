import express from "express";
import helmet from "helmet";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.route";
import userRoutes from "./routes/user.route";
import roleRoutes from "./routes/role.route";
import permissionRoutes from "./routes/permission.route";
import productCategoryRoutes from "./routes/product-category.route";
import brandRoutes from "./routes/brand.route";
import unitOfMeasureRoutes from "./routes/unit-of-measure.route";
import supplierRoutes from "./routes/supplier.route";
import productRoutes from "./routes/product.route";
import warehouseRoutes from "./routes/warehouse.route";
import inventoryRoutes from "./routes/inventory.route";
import locationAllowedCategoryRoutes from "./routes/location-allowed-category.route";
import { globalErrorHandler } from "./middlewares/error.middleware";

dotenv.config();

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/permissions", permissionRoutes);
app.use("/api/product-categories", productCategoryRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/units-of-measure", unitOfMeasureRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/products", productRoutes);
app.use("/api/warehouses", warehouseRoutes);
app.use("/api/inventories", inventoryRoutes);
app.use("/api/location-allowed-categories", locationAllowedCategoryRoutes);

// Error Middleware
app.use(globalErrorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
