# Companion return and furniture interactions

The full house now has a direct “Back to my companion” button. In the classroom shell this explicitly opens the companion activity instead of routing to the Home hub. Offline Home also renders the companion scene, with Build home as the entry back into the full house.

Furniture inspection offers a specific action (Rest here, Read here, Tend this plant, Play with this). The pet walks along the existing path, the camera follows closely, and the furniture interaction starts only on arrival. Cushions/chairs/sofas place the resting pet on the furniture with the appropriate depth; books, watering cans/drops, bouncing toys, mirror sparkles and lamp glow provide visible effects. A new invitation releases the object. Props are decorative and do not grant food, money or care rewards; feeding/washing still use the care controls. Reduced-motion settings disable the added animation.

Validation: 35 house/weather/navigation unit tests passed, TypeScript and changed-code lint passed. Browser test verified cushion use, plant use and interruption. Installed local phone check verified no horizontal overflow and the complete companion → full house → companion loop. Live synthetic classroom verified return to the companion scene and its Explore my house button; existing battle, reload, receipt and classmate checks also passed. Synthetic classroom removed after verification.

Live version: e4bada24-6327-4cd6-8579-ed379ea576b4.
Local rollback: /home/dre/Games/V-Pet-Local/site-before-furniture-return-20260927.
Screenshots: /home/dre/Pictures/V-Pet-Weather-2026-09-27/furniture-rest.png, furniture-plant.png, returned-companion.png.
