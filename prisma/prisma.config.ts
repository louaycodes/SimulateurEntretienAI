import { defineConfig } from 'prisma/config';

export default defineConfig({
    datasources: {
        db: {
            url: 'postgresql://skillsphere:skillsphere_dev@localhost:5432/skillsphere',
        },
    },
});
