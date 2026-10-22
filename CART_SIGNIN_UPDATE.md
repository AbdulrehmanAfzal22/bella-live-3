# Sign in before adding to cart

Signed-out visitors clicking Add to bag go to /login with a returnTo parameter for the current product URL, including its query and fragment. After signing in, the existing authentication flow returns them to that product. They can then choose their options and add the product to their bag.

The guest button remains clickable without a selected variant. It waits while the initial authentication check is running. Signed-in customers retain the existing variant, stock and quantity checks. Guests do not send an add-to-cart request. No database change is required.

Validation: all 69 existing tests and the production build pass. React DOM interaction checks verify the guest redirect, preserved return URL, no guest cart writes, authentication loading, variant and stock checks, and successful add-to-cart for a signed-in customer. Earlier whole-card links are retained.
