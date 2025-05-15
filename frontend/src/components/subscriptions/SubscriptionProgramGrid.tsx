import type { SubscriptionProgram } from '../../types/subscriptionProgram';
import type { Product } from '../../types/product';
import { Button } from '../ui/button';

interface SubscriptionProgramGridProps {
    subscriptionPrograms: SubscriptionProgram[];
    products: Product[];
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
}

export function SubscriptionProgramGrid({ subscriptionPrograms, products, onEdit, onDelete }: SubscriptionProgramGridProps) {
    function getProductNames(ids: string[]) {
        return products.filter(p => ids.includes(p.id)).map(p => p.name);
    }
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {subscriptionPrograms.map(program => (
                <div
                    key={program.id}
                    className="backdrop-blur-md bg-gradient-to-br from-[#23202b]/80 to-[#19161c]/80 border-2 border-transparent rounded-xl shadow-lg p-4 flex flex-col h-full relative group transition-transform duration-150 hover:scale-[1.025] hover:border-gradient-to-r hover:from-[#9945ff] hover:to-[#14f195]"
                    style={{ borderImage: 'linear-gradient(90deg, #9945ff 0%, #14f195 100%) 1' }}
                >
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-extrabold text-white truncate text-base tracking-wide drop-shadow">{program.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r ${program.active ? 'from-[#14f195]/80 to-[#9945ff]/80 text-white' : 'from-red-600/60 to-red-400/60 text-white'} shadow-sm`}>{program.active ? 'Active' : 'Inactive'}</span>
                    </div>
                    <span className="text-xs text-white/60 truncate block mb-1 font-light">{program.description}</span>
                    <div className="flex flex-wrap gap-1 mb-2">
                        {getProductNames(program.product_ids).map(name => (
                            <span key={name} className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-[#9945ff]/60 to-[#14f195]/60 text-white/90 shadow-sm">{name}</span>
                        ))}
                        <span className="font-bold text-xs bg-gradient-to-r from-[#9945ff] to-[#14f195] bg-clip-text text-transparent drop-shadow">x{program.quota}</span>
                    </div>
                    <div className="flex items-center justify-between mt-auto">
                        <span className="font-bold text-lg bg-gradient-to-r from-[#14f195] to-[#9945ff] bg-clip-text text-transparent drop-shadow">${program.price}</span>
                        <div className="flex gap-1 mt-auto justify-end">
                            <Button size="sm" variant="outline" className="px-3 py-1 text-xs bg-gradient-to-r from-[#9945ff]/20 to-[#14f195]/20 border-none text-white hover:from-[#14f195]/40 hover:to-[#9945ff]/40" onClick={() => onEdit(program.id)}>
                                Edit
                            </Button>
                            <Button size="sm" variant="destructive" className="px-3 py-1 text-xs bg-gradient-to-r from-red-500/20 to-red-400/20 border-none text-white hover:from-red-600/40 hover:to-red-400/40" onClick={() => onDelete(program.id)}>
                                Delete
                            </Button>
                        </div>
                    </div>
                </div>
            ))}
            {subscriptionPrograms.length === 0 && <div className="text-white/60 text-center py-4 col-span-full">No subscription programs found.</div>}
        </div>
    );
} 