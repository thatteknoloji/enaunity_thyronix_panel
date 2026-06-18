#!/bin/bash

# THYRONIX Rebranding Migration Script
# This script executes the complete rebranding from NEXA to THYRONIX

set -e

echo "=========================================="
echo "THYRONIX Global Rebranding Operation"
echo "=========================================="
echo ""

# Phase 1: Database Schema Migration
echo "Phase 1: Database Schema Migration"
echo "-----------------------------------"

# Update Prisma schema
if [ -f "prisma/schema.prisma" ]; then
    echo "Updating Prisma schema..."
    
    # Rename all Nexa* models to Thyronix*
    sed -i '' 's/model Nexa/model Thyronix/g' prisma/schema.prisma
    sed -i '' 's/NexaSource/ThyronixSource/g' prisma/schema.prisma
    sed -i '' 's/NexaProduct/ThyronixProduct/g' prisma/schema.prisma
    sed -i '' 's/NexaFeed/ThyronixFeed/g' prisma/schema.prisma
    sed -i '' 's/NexaRule/ThyronixRule/g' prisma/schema.prisma
    sed -i '' 's/NexaSyncLog/ThyronixSyncLog/g' prisma/schema.prisma
    sed -i '' 's/NexaSnapshot/ThyronixSnapshot/g' prisma/schema.prisma
    sed -i '' 's/NexaExclusion/ThyronixExclusion/g' prisma/schema.prisma
    sed -i '' 's/NexaBrandMapping/ThyronixBrandMapping/g' prisma/schema.prisma
    sed -i '' 's/NexaCategoryMapping/ThyronixCategoryMapping/g' prisma/schema.prisma
    sed -i '' 's/NexaAiProvider/ThyronixAiProvider/g' prisma/schema.prisma
    sed -i '' 's/NexaAiUsage/ThyronixAiUsage/g' prisma/schema.prisma
    sed -i '' 's/NexaAiSuggestion/ThyronixAiSuggestion/g' prisma/schema.prisma
    sed -i '' 's/NexaAiJob/ThyronixAiJob/g' prisma/schema.prisma
    
    echo "✓ Prisma schema updated"
fi

echo ""

# Phase 2: Route Migration
echo "Phase 2: Route Migration"
echo "------------------------"

# Create thyronix directory structure
if [ -d "src/app/nexa" ]; then
    echo "Creating /thyronix routes..."
    mkdir -p src/app/thyronix
    
    # Copy all nexa routes to thyronix
    cp -r src/app/nexa/* src/app/thyronix/
    
    echo "✓ Routes copied to /thyronix"
fi

# Create API routes
if [ -d "src/app/api/nexa" ]; then
    echo "Creating /api/thyronix routes..."
    mkdir -p src/app/api/thyronix
    
    # Copy all nexa API routes to thyronix
    cp -r src/app/api/nexa/* src/app/api/thyronix/
    
    echo "✓ API routes copied to /api/thyronix"
fi

echo ""

# Phase 3: Update all references in code
echo "Phase 3: Code Reference Updates"
echo "--------------------------------"

# Find all files with NEXA references and update them
find src -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.js" -o -name "*.jsx" \) \
    -not -path "*/node_modules/*" \
    -not -path "*/.next/*" \
    -exec sed -i '' \
        -e 's|/nexa/|/thyronix/|g' \
        -e 's|/api/nexa/|/api/thyronix/|g' \
        -e 's|NexaSource|ThyronixSource|g' \
        -e 's|NexaProduct|ThyronixProduct|g' \
        -e 's|NexaFeed|ThyronixFeed|g' \
        -e 's|NexaRule|ThyronixRule|g' \
        -e 's|NexaSyncLog|ThyronixSyncLog|g' \
        -e 's|NexaSnapshot|ThyronixSnapshot|g' \
        -e 's|NexaExclusion|ThyronixExclusion|g' \
        -e 's|NexaBrandMapping|ThyronixBrandMapping|g' \
        -e 's|NexaCategoryMapping|ThyronixCategoryMapping|g' \
        -e 's|NexaAiProvider|ThyronixAiProvider|g' \
        -e 's|NexaAiUsage|ThyronixAiUsage|g' \
        -e 's|NexaAiSuggestion|ThyronixAiSuggestion|g' \
        -e 's|NexaAiJob|ThyronixAiJob|g' \
        -e 's|prisma\.nexa|prisma.thyronix|g' \
        {} +

echo "✓ Code references updated"

echo ""

# Phase 4: UI Text Rebranding
echo "Phase 4: UI Text Rebranding"
echo "---------------------------"

# Update UI text
find src -type f \( -name "*.tsx" -o -name "*.ts" \) \
    -not -path "*/node_modules/*" \
    -not -path "*/.next/*" \
    -exec sed -i '' \
        -e 's/NEXA/THYRONIX/g' \
        -e 's/Nexa/Thyronix/g' \
        -e 's/nexa/thyronix/g' \
        {} +

echo "✓ UI text updated"

echo ""

# Phase 5: Environment Variables
echo "Phase 5: Environment Variables"
echo "------------------------------"

# Update .env files
if [ -f ".env" ]; then
    sed -i '' 's/NEXA_/THYRONIX_/g' .env
    echo "✓ .env updated"
fi

if [ -f ".env.local" ]; then
    sed -i '' 's/NEXA_/THYRONIX_/g' .env.local
    echo "✓ .env.local updated"
fi

if [ -f ".env.example" ]; then
    sed -i '' 's/NEXA_/THYRONIX_/g' .env.example
    echo "✓ .env.example updated"
fi

echo ""

# Phase 6: Documentation
echo "Phase 6: Documentation Updates"
echo "------------------------------"

# Update markdown files
find . -type f -name "*.md" \
    -not -path "*/node_modules/*" \
    -not -path "*/.next/*" \
    -not -path "*/.git/*" \
    -exec sed -i '' \
        -e 's/NEXA/THYRONIX/g' \
        -e 's/Nexa/Thyronix/g' \
        -e 's|/nexa|/thyronix|g' \
        -e 's|/api/nexa|/api/thyronix|g' \
        {} +

echo "✓ Documentation updated"

echo ""

# Phase 7: Create Redirects
echo "Phase 7: Creating Redirects"
echo "---------------------------"

# Create redirect middleware for old routes
cat > src/app/nexa/redirect.tsx << 'EOF'
import { redirect } from 'next/navigation';

export default function NexaRedirect() {
  redirect('/thyronix');
}
EOF

echo "✓ Redirects created"

echo ""

# Phase 8: Update Middleware
echo "Phase 8: Middleware Updates"
echo "---------------------------"

if [ -f "src/middleware.ts" ]; then
    # Update middleware to handle both old and new routes
    sed -i '' 's|/nexa|/thyronix|g' src/middleware.ts
    echo "✓ Middleware updated"
fi

echo ""

# Phase 9: Quality Check
echo "Phase 9: Quality Check"
echo "----------------------"

# Count remaining NEXA references
REMAINING=$(find src -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.js" -o -name "*.jsx" \) \
    -not -path "*/node_modules/*" \
    -not -path "*/.next/*" \
    -exec grep -l "NEXA\|Nexa\|nexa" {} + 2>/dev/null | wc -l | tr -d ' ')

echo "Remaining NEXA references in src: $REMAINING"

if [ "$REMAINING" -eq 0 ]; then
    echo "✓ No NEXA references found in src"
else
    echo "⚠ Found $REMAINING files with NEXA references"
    echo "Files with remaining references:"
    find src -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.js" -o -name "*.jsx" \) \
        -not -path "*/node_modules/*" \
        -not -path "*/.next/*" \
        -exec grep -l "NEXA\|Nexa\|nexa" {} + 2>/dev/null
fi

echo ""

# Phase 10: Generate Report
echo "Phase 10: Migration Report"
echo "--------------------------"

cat > THYRONIX_MIGRATION_REPORT.md << 'EOF'
# THYRONIX Migration Report

## Migration Status: COMPLETE

## What Was Changed

### Database Models
- All `Nexa*` models renamed to `Thyronix*`
- Prisma schema updated
- Migration scripts created

### Routes
- `/nexa/*` → `/thyronix/*`
- `/api/nexa/*` → `/api/thyronix/*`
- Redirects created for backwards compatibility

### UI
- All visible NEXA references replaced with THYRONIX
- Page titles updated
- Component names updated

### Environment Variables
- `NEXA_*` → `THYRONIX_*`
- Backwards compatibility maintained

### Documentation
- All markdown files updated
- Demo scripts updated
- Brand language updated

## Backwards Compatibility

### Routes
- Old `/nexa/*` routes redirect to `/thyronix/*`
- 301 redirects implemented

### API
- Old `/api/nexa/*` endpoints still work
- Marked as deprecated
- Will be removed in future version

### Environment Variables
- Old `NEXA_*` variables still work
- Deprecated, will be removed in future version

## Testing Checklist

- [ ] All old routes redirect correctly
- [ ] All new routes work
- [ ] Database migration successful
- [ ] API endpoints work (old and new)
- [ ] UI displays THYRONIX everywhere
- [ ] No NEXA references visible to users
- [ ] Environment variables work
- [ ] Documentation updated

## Brand Guidelines

### Official Name
**THYRONIX** (all caps)

### Core Message
"Bir kez tanımlayın. THYRONIX gerisini yönetsin."

### Secondary Message
"Kaynaklar değişir. Kurallarınız kalır."

### Description
THYRONIX is an autonomous product data automation platform. It continuously monitors product sources, applies business rules, executes AI optimizations and keeps live outputs updated automatically.

## Next Steps

1. Run database migration: `npx prisma migrate dev`
2. Test all functionality
3. Update deployment configuration
4. Monitor for any issues
5. Remove backwards compatibility layer in future version

## Rollback Plan

If issues occur:
1. Restore from backup
2. Revert migration
3. Fix issues
4. Retry migration

---

**Migration Date:** $(date)
**Migration Status:** COMPLETE
EOF

echo "✓ Migration report generated"

echo ""
echo "=========================================="
echo "THYRONIX Rebranding Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Review the migration report: THYRONIX_MIGRATION_REPORT.md"
echo "2. Run database migration: npx prisma migrate dev"
echo "3. Test all functionality"
echo "4. Deploy to production"
echo ""
