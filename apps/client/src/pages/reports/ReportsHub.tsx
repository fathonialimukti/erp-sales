import { useState } from "react";
import { useIntl } from "react-intl";

import { PageHeader } from "../../components/PageHeader";
import { ReportFilters, type ReportFilterValue } from "../../components/reports/ReportFilters";
import { SalesReport } from "./sections/SalesReport";
import { FieldReport } from "./sections/FieldReport";
import { CollectionReport } from "./sections/CollectionReport";
import { PromoReport } from "./sections/PromoReport";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

type TabKey = "sales" | "field" | "collection" | "promo";

const TABS: { key: TabKey; labelId: string; defaultMessage: string }[] = [
  { key: "sales", labelId: "report.tab.sales", defaultMessage: "Sales" },
  { key: "field", labelId: "report.tab.field", defaultMessage: "Field" },
  { key: "collection", labelId: "report.tab.collection", defaultMessage: "Collection" },
  { key: "promo", labelId: "report.tab.promo", defaultMessage: "Promo" },
];

export const ReportsHub = () => {
  const intl = useIntl();
  const [tab, setTab] = useState<TabKey>("sales");
  const [filters, setFilters] = useState<ReportFilterValue>({});

  return (
    <section
      className="flex flex-col gap-6 pt-2 pb-8"
      data-ai-context={JSON.stringify({ section: "reports-hub", tab })}
    >
      <PageHeader
        module="report"
        eyebrow={intl.formatMessage({ id: "nav.reports", defaultMessage: "Reports" })}
        title={intl.formatMessage({ id: "report.hub.title", defaultMessage: "Reports" })}
        description={intl.formatMessage({
          id: "report.hub.description",
          defaultMessage: "Analyze sales, field activity, collections, and promotion performance.",
        })}
      />

      <Card className="shadow-sm">
        <CardContent className="space-y-5 pt-6">
          <ReportFilters value={filters} onChange={setFilters} />

          <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
            <TabsList>
              {TABS.map((t) => (
                <TabsTrigger key={t.key} value={t.key}>
                  {intl.formatMessage({ id: t.labelId, defaultMessage: t.defaultMessage })}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="sales" className="mt-4">
              <SalesReport filters={filters} />
            </TabsContent>
            <TabsContent value="field" className="mt-4">
              <FieldReport filters={filters} />
            </TabsContent>
            <TabsContent value="collection" className="mt-4">
              <CollectionReport filters={filters} />
            </TabsContent>
            <TabsContent value="promo" className="mt-4">
              <PromoReport filters={filters} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </section>
  );
};

export default ReportsHub;
