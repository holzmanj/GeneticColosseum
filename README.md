# Genetic Colosseum
This is mostly just a toy program for experimenting with genetic algorithms (and familiarizing myself with javascript).

[See it in action here.](https://holzmanj.github.io/GeneticColosseum/)

## What's happening?
A fighter's "genome" is a string that encodes a sequence of the following actions:
* Move left
* Move right
* Shoot left
* Shoot right
* Jump

Each fighter carries out the action sequence encoded in his genome in a loop until he dies or outlives the rest of the fighters.
Fighters are given a score depending on how long they survive, and a certain number of the lowest-scoring fighters are culled from the population.

Those fighters are then replaced with offspring of the winning fighters and "outsiders."
Offspring is created by combining the genomes of the two highest-scoring fighters (through one of several techniques).
And during the combining of the parents' genomes, there is a chance that any given gene will mutate into another value.<br>
Outsiders are just new fighters with randomized genomes.

After all the culled fighters are replaced, a new generation begins and the process repeats.
