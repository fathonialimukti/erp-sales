import { useState } from 'react';
import { useIntl } from 'react-intl';
import { ModulePage, ModuleHero } from '../../components/ModulePage';
import { icons } from '../../assets/icons';
import { ReportFilters, type ReportFilterValue } from '../../components/reports/ReportFilters';
import { SalesReport } from './sections/SalesReport';
import { FieldReport } from './sections/FieldReport';
import { CollectionReport } from './sections/CollectionReport';
import { PromoReport } from './sections/PromoReport';

type TabKey = 'sales' | 'field' | 'collection' | 'promo';

const TABS: { key: TabKey; labelId: string }[] = [
  { key: 'sales', labelId: 'report.tab.sales' },
  { key: 'field', labelId: 'report.tab.field' },
  { key: 'collection', labelId: 'report.tab.collection' },
  { key: 'promo', labelId: 'report.tab.promo' },
];

export const ReportsHub = () => {
  const intl = useIntl();
  const [tab, setTab] = useState<TabKey>('sales');
  const [filters, setFilters] = useState<ReportFilterValue>({});

  return (
    <ModulePage accent="#0A84FF" accentEnd="#5E5CE6" aiContext={{ section: 'reports-hub' }}>
      <ModuleHero
        kicker={intl.formatMessage({ id: 'nav.reports', defaultMessage: 'Reports' })}
        title={intl.formatMessage({ id: 'report.hub.title', defaultMessage: 'Reports' })}
        subtitle={intl.formatMessage({
          id: 'report.hub.description',
          defaultMessage: 'Analyze sales, field activity, collections, and promotion performance.',
        })}
      />

      <div className="report-hub">
        <ReportFilters value={filters} onChange={setFilters} />

        <div className="report-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={`report-tab ${tab === t.key ? 'is-active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {intl.formatMessage({ id: t.labelId })}
            </button>
          ))}
        </div>

        <div className="report-tabpanel">
          {tab === 'sales' && <SalesReport filters={filters} />}
          {tab === 'field' && <FieldReport filters={filters} />}
          {tab === 'collection' && <CollectionReport filters={filters} />}
          {tab === 'promo' && <PromoReport filters={filters} />}
        </div>
      </div>
    </ModulePage>
  );
};

export default ReportsHub;
