import { Package, Plus, Trash2, Laptop, Smartphone, CreditCard, Key } from 'lucide-react';
import { useAssets } from '../../../context/AssetsContext';

interface Props {
  employeeId?: string;
  data: any[];
  errors: any;
  onChange: (data: any[]) => void;
}

const typeIcons: Record<string, React.ElementType> = {
  laptop: Laptop,
  mobile: Smartphone,
  id_card: CreditCard,
  access_card: Key,
  other: Package,
};

export default function AssetsForm({ employeeId, data, onChange }: Props) {
  const { assets, assignments, getAvailableAssets } = useAssets();

  // Assets currently assigned to this employee
  const employeeAssignments = employeeId
    ? assignments.filter(a => a.employeeId === employeeId && !a.returnedDate)
    : [];

  // Merge: show existing assignments + any manually added ones from `data`
  const availableAssets = getAvailableAssets();

  const handleAssignFromPool = (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;
    onChange([
      ...data,
      {
        assetId: asset.id,
        assetName: asset.name,
        assetType: asset.assetType || (asset as any).asset_type,
        serialNumber: asset.serialNumber,
        issueDate: new Date().toISOString().split('T')[0],
        status: 'Assigned',
        fromPool: true,
      },
    ]);
  };

  const handleRemove = (index: number) => {
    onChange(data.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl mb-6 flex items-start gap-3">
        <Package className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-primary-800 dark:text-primary-300">
          Select assets from the pool below to assign to this employee, or use the Asset Management page for advanced tracking.
        </p>
      </div>

      {/* Currently assigned assets (from DB) */}
      {employeeAssignments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-secondary-700 dark:text-surface-300">Currently Assigned</h4>
          {employeeAssignments.map(assignment => {
            const asset = assets.find(a => a.id === assignment.assetId);
            const TypeIcon = typeIcons[(asset as any)?.assetType] || Package;
            return (
              <div key={assignment.id} className="flex items-center gap-3 p-3 bg-success-50 dark:bg-success-900/10 border border-success-200 dark:border-success-800 rounded-lg">
                <div className="w-8 h-8 rounded-lg bg-success-100 dark:bg-success-900/30 flex items-center justify-center">
                  <TypeIcon className="w-4 h-4 text-success-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-secondary-900 dark:text-white truncate">{assignment.assetName || asset?.name}</p>
                  {asset?.serialNumber && (
                    <p className="text-xs text-secondary-500">S/N: {asset.serialNumber}</p>
                  )}
                </div>
                <span className="badge badge-success text-[10px]">Active</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Newly selected assets (pending save) */}
      {data.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-secondary-700 dark:text-surface-300">New Assignments (pending save)</h4>
          {data.map((item, index) => {
            const TypeIcon = typeIcons[item.assetType] || Package;
            return (
              <div key={index} className="flex items-center gap-3 p-3 bg-warning-50 dark:bg-warning-900/10 border border-warning-200 dark:border-warning-800 rounded-lg group relative">
                <div className="w-8 h-8 rounded-lg bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center">
                  <TypeIcon className="w-4 h-4 text-warning-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-secondary-900 dark:text-white truncate">{item.assetName}</p>
                  {item.serialNumber && (
                    <p className="text-xs text-secondary-500">S/N: {item.serialNumber}</p>
                  )}
                </div>
                <button
                  onClick={() => handleRemove(index)}
                  className="p-1.5 text-secondary-400 hover:text-error-500 hover:bg-error-50 dark:hover:bg-error-500/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Available assets pool */}
      {availableAssets.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-secondary-700 dark:text-surface-300">
            Available Assets ({availableAssets.filter(a => !data.find(d => d.assetId === a.id)).length})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
            {availableAssets
              .filter(a => !data.find(d => d.assetId === a.id))
              .map(asset => {
                const TypeIcon = typeIcons[asset.assetType || (asset as any).asset_type] || Package;
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => handleAssignFromPool(asset.id)}
                    className="flex items-center gap-3 p-3 border border-surface-200 dark:border-surface-700 rounded-lg hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
                      <TypeIcon className="w-4 h-4 text-secondary-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-secondary-900 dark:text-white truncate">{asset.name}</p>
                      {asset.serialNumber && (
                        <p className="text-[10px] text-secondary-400">S/N: {asset.serialNumber}</p>
                      )}
                    </div>
                    <Plus className="w-4 h-4 text-primary-500 flex-shrink-0" />
                  </button>
                );
              })}
          </div>
        </div>
      ) : (
        <div className="text-center py-6 text-secondary-400">
          <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No available assets to assign.</p>
          <p className="text-xs mt-1">Create assets in the Asset Management page first.</p>
        </div>
      )}
    </div>
  );
}
