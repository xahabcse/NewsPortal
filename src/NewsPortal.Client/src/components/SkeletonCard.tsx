const SkeletonCard = () => {
    return (
        <div className="glass-morphism border border-glass-border rounded-2xl overflow-hidden animate-pulse">
            {/* Image Placeholder */}
            <div className="h-48 bg-white/10 relative">
                <div className="absolute top-4 left-4 h-4 w-16 bg-white/20 rounded"></div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
                {/* Meta Info */}
                <div className="flex items-center gap-2">
                    <div className="h-3 bg-white/10 rounded w-20"></div>
                    <div className="w-1 h-1 rounded-full bg-white/10"></div>
                    <div className="h-3 bg-white/10 rounded w-16"></div>
                </div>

                {/* Title */}
                <div className="space-y-2">
                    <div className="h-5 bg-white/10 rounded w-full"></div>
                    <div className="h-5 bg-white/10 rounded w-5/6"></div>
                </div>

                {/* Summary */}
                <div className="space-y-2">
                    <div className="h-4 bg-white/10 rounded w-full"></div>
                    <div className="h-4 bg-white/10 rounded w-full"></div>
                    <div className="h-4 bg-white/10 rounded w-3/4"></div>
                </div>

                {/* Read More Button Placeholder */}
                <div className="pt-2">
                    <div className="h-4 bg-white/10 rounded w-24"></div>
                </div>
            </div>
        </div>
    );
};

export default SkeletonCard;
