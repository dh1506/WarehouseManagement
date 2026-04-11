import { PrismaClient, UomType } from "../../src/generated";
import { normalizeNameToCode } from "../../src/utils/generate-code.util";

export async function seedCatalog(prisma: PrismaClient) {
  console.log("Seeding Catalog...");

  const uoms = [
    { code: "KG", name: "Kilogram", uom_type: UomType.WEIGHT },
    { code: "G", name: "Gram", uom_type: UomType.WEIGHT },
    { code: "L", name: "Lít", uom_type: UomType.VOLUME },
    { code: "ML", name: "Mililit", uom_type: UomType.VOLUME },
    { code: "PC", name: "Cái/Chiếc", uom_type: UomType.QUANTITY },
    { code: "BAG", name: "Túi", uom_type: UomType.PACK },
    { code: "BOX", name: "Hộp/Thùng", uom_type: UomType.PACK },
    { code: "PACK", name: "Gói", uom_type: UomType.PACK },
    { code: "BOTTLE", name: "Chai", uom_type: UomType.PACK },
    { code: "CAN", name: "Lon", uom_type: UomType.PACK },
  ];

  for (const u of uoms) {
    await prisma.unitOfMeasure.upsert({
      where: { code: u.code },
      update: {},
      create: u,
    });
  }

  const categories = [
    { name: "Thực phẩm tươi sống", description: "Thịt, cá, hải sản tươi" },
    { name: "Rau củ quả", description: "Các loại rau, trái cây" },
    { name: "Sữa và các sản phẩm từ sữa", description: "Sữa tươi, phô mai, bơ" },
    { name: "Gia vị và dầu ăn", description: "Muối, đường, nước mắm, dầu ăn" },
    { name: "Đồ uống", description: "Nước ngọt, nước suối" },
    { name: "Đồ uống có cồn", description: "Bia, rượu" },
    { name: "Hàng đông lạnh", description: "Thực phẩm cấp đông" },
    { name: "Hàng đóng hộp", description: "Cá mòi, thịt hộp" },
    { name: "Lương thực khô", description: "Gạo, mì, bún khô" },
    { name: "Bánh kẹo & Ăn nhẹ", description: "Snack, bánh quy" },
    { name: "Nguyên liệu pha chế", description: "Siro, bột trà sữa" },
    { name: "Bao bì & Dụng cụ", description: "Hộp xốp, muỗng nĩa dùng 1 lần" },
  ];

  for (const c of categories) {
    await prisma.productCategory.upsert({
      where: { code: normalizeNameToCode(c.name) },
      update: {},
      create: {
        code: normalizeNameToCode(c.name),
        name: c.name,
        description: c.description,
      },
    });
  }

  const brands = [
    { name: "Vinamilk" },
    { name: "TH True Milk" },
    { name: "Masan" },
    { name: "Ajinomoto" },
    { name: "Acecook" },
    { name: "CP Food" },
    { name: "Vissan" },
    { name: "Coca-Cola" },
    { name: "Pepsi" },
    { name: "Heineken" },
    { name: "Trung Nguyên" },
    { name: "Highlands Coffee" },
    { name: "Meizan" },
  ];

  for (const b of brands) {
    await prisma.brand.upsert({
      where: { code: normalizeNameToCode(b.name) },
      update: {},
      create: {
        code: normalizeNameToCode(b.name),
        name: b.name,
      },
    });
  }

  const suppliers = [
    { code: "SUP-FOODGATE", name: "Công ty Thực phẩm FoodGate", contact_person: "Anh Thắng", phone: "0901234567", email: "thang.fg@gmail.com", address: "Quận 7, HCM" },
    { code: "SUP-ABC-DIST", name: "Nhà phân phối ABC", contact_person: "Chị Lan", phone: "0901234568", email: "lan.abc@gmail.com", address: "Quận 12, HCM" },
    { code: "SUP-CPGROUP", name: "Tập đoàn CP Việt Nam", contact_person: "Anh Nam", phone: "0901234569", email: "nam.cp@cp.com.vn", address: "Biên Hòa, Đồng Nai" },
    { code: "SUP-VISSAN", name: "Công ty Vissan", contact_person: "Chị Mai", phone: "0901234570", email: "mai.vs@vissan.com", address: "Quận Bình Thạnh, HCM" },
    { code: "SUP-LOCALFARM", name: "Nông trại VietGAP Đà Lạt", contact_person: "Anh Tuấn", phone: "0901234571", email: "tuan.dalat@farm.vn", address: "Đà Lạt, Lâm Đồng" },
    { code: "SUP-BEVERAGE", name: "Tổng kho Nước giải khát Miền Nam", contact_person: "Chị Vy", phone: "0901234572", email: "vy.bev@southern.vn", address: "Quận Thủ Đức, HCM" },
    { code: "SUP-SEA-EXP", name: "Hải sản Cấp tốc Seafood Express", contact_person: "Anh Hải", phone: "0901234573", email: "hai.se@seafood.vn", address: "Bình Chánh, HCM" },
    { code: "SUP-PACK-SOL", name: "Giải pháp Bao bì Xanh", contact_person: "Chị Hoa", phone: "0901234574", email: "hoa.ps@greenpack.vn", address: "Tân Bình, HCM" },
    { code: "SUP-UNILEVER", name: "Unilever Professional", contact_person: "Anh Bình", phone: "0901234575", email: "binh.uni@unilever.com", address: "Quận 7, HCM" },
    { code: "SUP-TRUNGNGUYEN", name: "Tập đoàn Café Trung Nguyên", contact_person: "Anh Nguyên", phone: "0901234576", email: "nguyen.tn@trungnguyen.com.vn", address: "Quận 1, HCM" },
  ];

  for (const s of suppliers) {
    await prisma.supplier.upsert({
      where: { code: s.code },
      update: {},
      create: s,
    });
  }
}
