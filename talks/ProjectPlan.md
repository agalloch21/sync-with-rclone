# Problem to solve
I would like to keep all project-related files in a single folder to better orgnize, push, monitor and record the project. At the same time, this project folder should be a NAS server folder containing the most updated files so that other devices can get a latest copy. Normally, I can use Synology Drive to setup a bi-sync project folder to achieve that. However, if I also place source code repository inside the syncing folder, things get complex.

- For normal files, like design files, presentation files, management files, images and videos, etc. Synology Drive works fine.
- For official repositoies, I would use git to manage the code rather than Synology Drive. So placing them under the syncing folder while keeping them filtered out in Synology Drive UI will work. 
- For unoffical and test repositories, which may be worth to be saved but not to use versioning, as Synology Drive does not have filter mechanism like Git, it's a pain to find a way to exclude the unneeded files while keeping them under the syncing folder.


So I want to create a tool that can quickly sync folder between local machines and a NAS server with the support of .gitignore.


