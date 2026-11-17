import { expect, test } from "@playwright/test";

// Uses a real AI call for the first run of a sample (then the cache). Run only when asked: `npm run test:e2e`.
test("a sample card is read, a bad field blocks confirm, then the details confirm", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Pakistan" }).click();
  await page.getByRole("button", { name: /Clear photo/ }).click();

  const plate = page.getByLabel("Plate number");
  await expect(plate).toHaveValue("LEA-1234", { timeout: 30_000 });
  await expect(page.getByLabel("Chassis number (VIN)")).toHaveValue("NZE141-9876543");

  await plate.fill("");
  await page.getByRole("button", { name: "Confirm details" }).click();
  await expect(page.getByText("Enter the plate number")).toBeVisible();
  await expect(plate).toBeFocused();

  await plate.fill("lea 1234");
  await page.getByRole("button", { name: "Confirm details" }).click();
  await expect(page.getByText('"plate": "LEA-1234"')).toBeVisible();
});

test("uploading needs the consent tick first", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Drop a photo or PDF here").click();
  await expect(page.getByText("Tick “I understand” before uploading your own card.")).toBeVisible();
  await expect(page.getByLabel("I understand")).toBeFocused();
});
