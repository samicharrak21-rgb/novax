import { Link } from "react-router-dom";
export default function NotFound() {
  return (
    <div className="text-center py-20 space-y-3">
      <span className="brand-x text-6xl block">𝕏</span>
      <h1 className="text-xl font-black">الصفحة غير موجودة</h1>
      <Link to="/" className="text-primary text-sm">العودة للرئيسية</Link>
    </div>
  );
}
