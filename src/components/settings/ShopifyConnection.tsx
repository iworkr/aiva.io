"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Store, Link2, Unlink, ExternalLink, Loader2, RefreshCw, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

interface ShopifyStore {
  id: string;
  shop_domain: string;
  shop_name: string | null;
  shop_email: string | null;
  link_method: "shopify" | "existing_account" | null;
  is_active: boolean;
  created_at: string;
}

interface ShopifyConnectionProps {
  userId: string;
}

export function ShopifyConnection({ userId }: ShopifyConnectionProps) {
  const [stores, setStores] = useState<ShopifyStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlinking, setUnlinking] = useState<string | null>(null);

  // Fetch linked Shopify stores
  useEffect(() => {
    async function fetchStores() {
      try {
        const response = await fetch("/api/shopify/stores");
        if (response.ok) {
          const data = await response.json();
          setStores(data.stores || []);
        }
      } catch (error) {
        console.error("Failed to fetch Shopify stores:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStores();
  }, [userId]);

  // Unlink a store
  async function handleUnlink(storeId: string, shopDomain: string) {
    setUnlinking(storeId);
    try {
      const response = await fetch("/api/shopify/unlink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to unlink store");
      }

      // Remove from local state
      setStores((prev) => prev.filter((s) => s.id !== storeId));
      toast.success(`Unlinked ${shopDomain}`);
    } catch (error) {
      console.error("Unlink error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to unlink store");
    } finally {
      setUnlinking(null);
    }
  }

  // Format date for display
  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Store className="h-5 w-5 text-[#95bf47]" />
            Shopify Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Store className="h-5 w-5 text-[#95bf47]" />
              Shopify Integration
            </CardTitle>
            <CardDescription className="text-base">
              Connect your Shopify stores to enable AI-powered customer communication
            </CardDescription>
          </div>
          {stores.length > 0 && (
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
              {stores.length} {stores.length === 1 ? "Store" : "Stores"} Connected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {stores.length === 0 ? (
          // No stores connected
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 bg-[#95bf47]/10 rounded-full flex items-center justify-center mb-4">
              <ShoppingBag className="h-8 w-8 text-[#95bf47]" />
            </div>
            <h3 className="font-semibold mb-2">No Shopify Stores Connected</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-4">
              Connect your Shopify store to access customer data, order history, and enable
              AI-powered responses with full context.
            </p>
            <p className="text-xs text-muted-foreground">
              To connect, install the Aiva app from your Shopify admin or the{" "}
              <a
                href="https://apps.shopify.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Shopify App Store
              </a>
            </p>
          </div>
        ) : (
          // Connected stores list
          <div className="space-y-4">
            {stores.map((store) => (
              <div
                key={store.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#95bf47] rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M15.337 3.415c-.073-.017-.145-.01-.205.022-.06.032-.107.082-.145.147-.55.94-.902 1.83-1.047 2.674-.19-.058-.387-.104-.596-.138a2.54 2.54 0 00-.05-.56c-.15-.574-.46-.935-.868-1.01-.046-.009-.092-.013-.138-.013-.54 0-1.066.46-1.484 1.295-.294.585-.52 1.32-.612 1.887-.638.198-1.08.334-1.093.338-.34.107-.352.117-.396.438-.033.24-.918 7.07-.918 7.07l7.354 1.267.014-12.28c0-.074-.023-.137-.07-.184-.047-.047-.11-.07-.184-.07-.252 0-.444.075-.562.137z" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">
                        {store.shop_name || store.shop_domain.replace(".myshopify.com", "")}
                      </h4>
                      {store.is_active && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{store.shop_domain}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Link2 className="h-3 w-3" />
                        Linked {formatDate(store.created_at)}
                      </span>
                      {store.link_method && (
                        <span>
                          via{" "}
                          {store.link_method === "shopify" ? "Shopify Account" : "Existing Aiva Account"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a
                      href={`https://${store.shop_domain}/admin`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Open Store
                    </a>
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={unlinking === store.id}
                      >
                        {unlinking === store.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Unlink className="h-4 w-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Unlink Shopify Store?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will disconnect <strong>{store.shop_domain}</strong> from your Aiva
                          account. You can reconnect anytime from your Shopify admin.
                          <br />
                          <br />
                          Your store data will no longer be available for AI context.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleUnlink(store.id, store.shop_domain)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Unlink Store
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}

        <Separator />

        {/* Info about Shopify integration */}
        <div className="rounded-lg border border-[#95bf47]/20 bg-[#95bf47]/5 p-4">
          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-[#95bf47]" />
            Shopify Data Sync
          </h4>
          <p className="text-xs text-muted-foreground">
            When connected, Aiva automatically syncs your store's orders, customers, and products.
            This data helps the AI provide context-aware responses about order status, product
            details, and customer history.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}





