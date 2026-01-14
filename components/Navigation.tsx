import Link from 'next/link';
import { LayoutDashboard, Users, CreditCard, Landmark, Settings } from 'lucide-react';

export default function Navigation() {
    return (
        <nav className="border-b bg-white sticky top-0 z-10">
            <div className="container flex items-center justify-between h-16">
                <div className="flex items-center gap-8">
                    <Link href="/" className="text-xl font-bold text-primary flex items-center gap-2">
                        <Landmark className="text-secondary" />
                        <span>MStreet</span>
                    </Link>

                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-off-white transition-colors">
                            <LayoutDashboard size={18} />
                            <span>Dashboard</span>
                        </Link>
                        <Link href="/creditors" className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-off-white transition-colors">
                            <CreditCard size={18} />
                            <span>Creditors</span>
                        </Link>
                        <Link href="/debtors" className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-off-white transition-colors">
                            <Users size={18} />
                            <span>Debtors</span>
                        </Link>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button className="flex items-center gap-2 text-sm text-gray-600">
                        <Settings size={18} />
                        <span>Settings</span>
                    </button>
                    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-white font-bold">
                        JD
                    </div>
                </div>
            </div>
        </nav>
    );
}
